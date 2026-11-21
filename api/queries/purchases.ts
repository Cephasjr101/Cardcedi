import { getDb } from "./connection";
import {
  orders,
  orderEvents,
  purchases,
  purchaseEvents,
  type Order,
  type Purchase,
  type PurchaseEvent,
} from "@db/schema";
import { asc, desc, eq, and, lte, isNotNull, inArray } from "drizzle-orm";
import type { PurchaseStatus, PayoutStatus } from "@contracts/catalog";

const PURCHASE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePurchaseId(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += PURCHASE_ALPHABET[crypto.getRandomValues(new Uint8Array(1))[0] % PURCHASE_ALPHABET.length];
  }
  return `PU-${suffix}`;
}

/**
 * Atomically reserve an active listing and create the purchase.
 * SELECT ... FOR UPDATE prevents two buyers grabbing the same card.
 * Returns null when the listing is no longer available.
 */
export async function reserveAndCreatePurchase(data: {
  orderPublicId: string;
  buyerName: string;
  buyerPhone: string;
  buyerNetwork: "mtn" | "telecel" | "airteltigo";
  pricePesewas: number;
}): Promise<{ purchase: Purchase; order: Order } | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.publicId, data.orderPublicId))
      .for("update");
    if (!order || order.status !== "active") return null;

    const publicId = generatePurchaseId();
    const [{ id }] = await tx
      .insert(purchases)
      .values({
        publicId,
        orderId: order.id,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        buyerNetwork: data.buyerNetwork,
        pricePesewas: data.pricePesewas,
      })
      .$returningId();

    await tx.update(orders).set({ status: "reserved" }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({ orderId: order.id, status: "reserved" });
    await tx
      .insert(purchaseEvents)
      .values({ purchaseId: id, status: "awaiting_payment" });

    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, id));
    return { purchase, order };
  });
}

export async function findPurchaseByPublicId(publicId: string): Promise<Purchase | undefined> {
  return getDb().query.purchases.findFirst({ where: eq(purchases.publicId, publicId) });
}

export async function findPurchaseWithOrder(publicId: string) {
  const purchase = await findPurchaseByPublicId(publicId);
  if (!purchase) return null;
  const order = await getDb().query.orders.findFirst({ where: eq(orders.id, purchase.orderId) });
  if (!order) return null;
  return { purchase, order };
}

export async function listPurchaseEvents(purchaseId: number): Promise<PurchaseEvent[]> {
  return getDb()
    .select()
    .from(purchaseEvents)
    .where(eq(purchaseEvents.purchaseId, purchaseId))
    .orderBy(asc(purchaseEvents.createdAt), asc(purchaseEvents.id));
}

export async function listPurchases(filter?: PurchaseStatus): Promise<
  { purchase: Purchase; order: Order }[]
> {
  const db = getDb();
  const rows = await db
    .select({ purchase: purchases, order: orders })
    .from(purchases)
    .innerJoin(orders, eq(purchases.orderId, orders.id))
    .orderBy(desc(purchases.createdAt))
    .limit(200);
  return filter ? rows.filter((r) => r.purchase.status === filter) : rows;
}

/** Move a purchase to a new status, recording the event. */
export async function setPurchaseStatus(
  purchase: Purchase,
  status: PurchaseStatus,
  opts?: { note?: string; buyerNote?: string; adminNote?: string },
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({
        status,
        ...(opts?.buyerNote !== undefined ? { buyerNote: opts.buyerNote } : {}),
        ...(opts?.adminNote !== undefined ? { adminNote: opts.adminNote } : {}),
      })
      .where(eq(purchases.id, purchase.id));
    await tx
      .insert(purchaseEvents)
      .values({ purchaseId: purchase.id, status, note: opts?.note ?? null });
  });
}

/**
 * Payment confirmed → code released. Opens the buyer's dispute window and
 * schedules the seller payout for the end of it.
 */
export async function confirmPurchase(
  purchase: Purchase,
  order: Order,
  window: {
    note?: string;
    confirmedAt: Date;
    disputeDeadlineAt: Date;
    payoutDueAt: Date;
    payoutStatus: PayoutStatus;
  },
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({
        status: "confirmed",
        confirmedAt: window.confirmedAt,
        disputeDeadlineAt: window.disputeDeadlineAt,
        payoutDueAt: window.payoutDueAt,
        payoutStatus: window.payoutStatus,
        ...(window.note ? { adminNote: window.note } : {}),
      })
      .where(eq(purchases.id, purchase.id));
    await tx
      .insert(purchaseEvents)
      .values({ purchaseId: purchase.id, status: "confirmed", note: window.note ?? null });
    await tx.update(orders).set({ status: "sold" }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({ orderId: order.id, status: "sold" });
  });
}

/** Buyer reports a bad card inside the dispute window — freezes any pending payout. */
export async function disputePurchase(
  purchase: Purchase,
  data: { note: string; proofKey: string; disputedAt: Date },
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({
        status: "disputed",
        buyerNote: data.note,
        disputeProofKey: data.proofKey,
        disputedAt: data.disputedAt,
        payoutStatus: "frozen",
      })
      .where(eq(purchases.id, purchase.id));
    await tx
      .insert(purchaseEvents)
      .values({ purchaseId: purchase.id, status: "disputed", note: data.note });
  });
}

/** Confirmed purchases whose dispute window has fully elapsed — ready to auto-close. */
export async function listWindowExpiredPurchases(now: Date): Promise<Purchase[]> {
  return getDb()
    .select()
    .from(purchases)
    .where(
      and(
        eq(purchases.status, "confirmed"),
        isNotNull(purchases.payoutDueAt),
        lte(purchases.payoutDueAt, now),
      ),
    );
}

/** Auto-mode payouts that are due (scheduled, or failed and awaiting retry). */
export async function listDuePayouts(now: Date): Promise<Purchase[]> {
  return getDb()
    .select()
    .from(purchases)
    .where(
      and(
        inArray(purchases.status, ["confirmed", "completed"]),
        inArray(purchases.payoutStatus, ["scheduled", "failed"]),
        isNotNull(purchases.payoutDueAt),
        lte(purchases.payoutDueAt, now),
      ),
    );
}

/** Mark the seller payout as sent, recording the transfer reference. */
export async function markPayoutSent(purchase: Purchase, reference: string, note: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({ payoutStatus: "sent", payoutReference: reference, adminNote: note })
      .where(eq(purchases.id, purchase.id));
    await tx.insert(purchaseEvents).values({ purchaseId: purchase.id, status: "confirmed", note });
  });
}

/** Mark the payout attempt failed — the sweeper retries on the next tick. */
export async function markPayoutFailed(purchase: Purchase, note: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(purchases).set({ payoutStatus: "failed", adminNote: note }).where(eq(purchases.id, purchase.id));
    await tx.insert(purchaseEvents).values({ purchaseId: purchase.id, status: "confirmed", note });
  });
}

/** (Re)schedule the seller payout — used when a dispute resolves in the seller's favour. */
export async function schedulePayout(purchase: Purchase, dueAt: Date): Promise<void> {
  await getDb()
    .update(purchases)
    .set({ payoutStatus: "scheduled", payoutDueAt: dueAt })
    .where(eq(purchases.id, purchase.id));
}

/** Manual mode has nothing to pay out — clear the dispute freeze on resolution. */
export async function clearPayoutHold(purchase: Purchase): Promise<void> {
  await getDb()
    .update(purchases)
    .set({ payoutStatus: "not_required" })
    .where(eq(purchases.id, purchase.id));
}

/** Refund or cancel: purchase closes, the listing goes back on the market. */
export async function releasePurchase(
  purchase: Purchase,
  order: Order,
  status: "refunded" | "cancelled",
  note?: string,
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({ status, ...(note ? { adminNote: note } : {}) })
      .where(eq(purchases.id, purchase.id));
    await tx.insert(purchaseEvents).values({ purchaseId: purchase.id, status, note: note ?? null });
    await tx.update(orders).set({ status: "active" }).where(eq(orders.id, order.id));
    await tx
      .insert(orderEvents)
      .values({ orderId: order.id, status: "active", note: note ?? null });
  });
}

/**
 * Trade done: purchase → completed, order → paid.
 * The seller was already paid directly by the buyer — "paid" just closes the ledger.
 */
export async function completePurchase(purchase: Purchase, order: Order, note?: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(purchases)
      .set({ status: "completed", ...(note ? { adminNote: note } : {}) })
      .where(eq(purchases.id, purchase.id));
    await tx.insert(purchaseEvents).values({ purchaseId: purchase.id, status: "completed", note: note ?? null });
    await tx.update(orders).set({ status: "paid" }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({ orderId: order.id, status: "paid", note: note ?? null });
  });
}

