import { getDb } from "./connection";
import { orders, orderEvents, type Order, type OrderEvent } from "@db/schema";
import { asc, desc, eq } from "drizzle-orm";
import type { OrderStatus } from "@contracts/catalog";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1 — readable over the phone

export function generatePublicId(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[crypto.getRandomValues(new Uint8Array(1))[0] % ALPHABET.length];
  }
  return `CC-${suffix}`;
}

export async function createOrder(data: {
  publicId: string;
  brandId: string;
  amountUsdCents: number;
  ratePesewasPerUsd: number;
  payoutPesewas: number;
  network: "mtn" | "telecel" | "airteltigo";
  phone: string;
  accountName: string;
  cardCode: string;
  codeLast4: string;
  photoKey?: string;
}): Promise<Order> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [{ id }] = await tx.insert(orders).values(data).$returningId();
    await tx.insert(orderEvents).values({ orderId: id, status: "submitted" });
    const [row] = await tx.select().from(orders).where(eq(orders.id, id));
    return row;
  });
}

export async function findOrderByPublicId(publicId: string): Promise<Order | undefined> {
  return getDb().query.orders.findFirst({ where: eq(orders.publicId, publicId) });
}

export async function listOrderEvents(orderId: number): Promise<OrderEvent[]> {
  return getDb()
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
}

export async function listOrders(filter?: OrderStatus): Promise<Order[]> {
  const db = getDb();
  const base = db.select().from(orders);
  const rows = await (filter ? base.where(eq(orders.status, filter)) : base).orderBy(
    desc(orders.createdAt),
  );
  return rows.slice(0, 200);
}

/** Live listings for the public market — active only, newest first. */
export async function listActiveListings(): Promise<Order[]> {
  return getDb()
    .select()
    .from(orders)
    .where(eq(orders.status, "active"))
    .orderBy(desc(orders.createdAt))
    .limit(60);
}

export async function setOrderStatus(
  order: Order,
  status: OrderStatus,
  note?: string,
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status, adminNote: note ?? order.adminNote })
      .where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({ orderId: order.id, status, note: note ?? null });
  });
}
