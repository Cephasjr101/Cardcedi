import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { storage } from "./lib/storage";
import {
  findOrderByPublicId,
  listOrderEvents,
  listOrders,
  setOrderStatus,
} from "./queries/orders";
import {
  clearPayoutHold,
  completePurchase,
  findPurchaseWithOrder,
  listPurchaseEvents,
  listPurchases,
  releasePurchase,
  schedulePayout,
  setPurchaseStatus,
} from "./queries/purchases";
import { settlePurchase } from "./lib/settlement";
import { requireTwoFactor } from "./lib/twofa";
import { getPayments } from "./lib/payments";
import { getDb } from "./queries/connection";
import { orderEvents, orders } from "@db/schema";
import { eq } from "drizzle-orm";
import { ORDER_STATUSES, PURCHASE_STATUSES } from "@contracts/catalog";

// Forward-only listing lifecycle; reserved/sold/paid move via purchase actions.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted: ["verifying", "rejected"],
  verifying: ["active", "rejected"],
  active: ["delisted"],
  reserved: [],
  sold: [],
  paid: [],
  rejected: [],
  delisted: [],
};

export const adminRouter = createRouter({
  listOrders: adminQuery
    .input(z.object({ status: z.enum(ORDER_STATUSES).optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const rows = await listOrders(input?.status);
      return rows.map((o) => ({
        publicId: o.publicId,
        brandId: o.brandId,
        amountUsdCents: o.amountUsdCents,
        payoutPesewas: o.payoutPesewas,
        network: o.network,
        phone: o.phone,
        accountName: o.accountName,
        codeLast4: o.codeLast4,
        status: o.status,
        createdAt: o.createdAt,
        hasPhoto: !!o.photoKey,
      }));
    }),

  orderDetail: adminQuery
    .input(z.object({ publicId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const order = await findOrderByPublicId(input.publicId.toUpperCase());
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const events = await listOrderEvents(order.id);
      return {
        ...order,
        events,
      };
    }),

  photoUrl: adminQuery
    .input(z.object({ publicId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const order = await findOrderByPublicId(input.publicId.toUpperCase());
      if (!order?.photoKey) throw new TRPCError({ code: "NOT_FOUND" });
      const { url } = await storage.getPresignedUrl({ key: order.photoKey });
      return { url };
    }),

  /** Signed URL for the buyer's dispute proof image. */
  disputeProofUrl: adminQuery
    .input(z.object({ publicId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found?.purchase.disputeProofKey) throw new TRPCError({ code: "NOT_FOUND" });
      const { url } = await storage.getPresignedUrl({ key: found.purchase.disputeProofKey });
      return { url };
    }),

  setStatus: adminQuery
    .input(
      z.object({
        publicId: z.string(),
        status: z.enum(ORDER_STATUSES),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const order = await findOrderByPublicId(input.publicId.toUpperCase());
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.status === input.status) return { ok: true, status: order.status };
      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot move from ${order.status} to ${input.status}.`,
        });
      }
      if (input.status === "rejected" && !input.note) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A rejection needs a reason — the trader sees it.",
        });
      }
      await setOrderStatus(order, input.status, input.note);
      return { ok: true, status: input.status };
    }),

  /* ---------------- buyer-side operations ---------------- */

  listPurchases: adminQuery
    .input(z.object({ status: z.enum(PURCHASE_STATUSES).optional() }).optional())
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const rows = await listPurchases(input?.status);
      return rows.map(({ purchase: p, order: o }) => ({
        publicId: p.publicId,
        orderPublicId: o.publicId,
        brandId: o.brandId,
        amountUsdCents: o.amountUsdCents,
        pricePesewas: p.pricePesewas,
        buyerName: p.buyerName,
        buyerPhone: p.buyerPhone,
        buyerNetwork: p.buyerNetwork,
        status: p.status,
        buyerNote: p.buyerNote,
        payoutStatus: p.payoutStatus,
        payoutDueAt: p.payoutDueAt,
        disputedAt: p.disputedAt,
        hasDisputeProof: !!p.disputeProofKey,
        createdAt: p.createdAt,
      }));
    }),

  purchaseDetail: adminQuery
    .input(z.object({ publicId: z.string() }))
    .query(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      const events = await listPurchaseEvents(found.purchase.id);
      return { ...found, events };
    }),

  /** Payments arrived → release the card code (and auto-pay the seller in gateway mode). */
  confirmPayment: adminQuery
    .input(
      z.object({
        publicId: z.string(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      const { purchase, order } = found;
      if (!["awaiting_payment", "payment_sent"].includes(purchase.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot confirm a ${purchase.status} purchase.`,
        });
      }
      await settlePurchase(purchase, order, input.note);
      return { ok: true, status: "confirmed" as const };
    }),

  /** Return the buyer's money. rejectCard = dispute upheld → listing dies too. */
  refund: adminQuery
    .input(
      z.object({
        publicId: z.string(),
        note: z.string().trim().min(3).max(500),
        rejectCard: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      const { purchase, order } = found;
      if (["completed", "refunded", "cancelled"].includes(purchase.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A ${purchase.status} purchase cannot be refunded.`,
        });
      }
      if (input.rejectCard) {
        await setPurchaseStatus(purchase, "refunded", { adminNote: input.note, note: input.note });
        const db = getDb();
        await db.update(orders).set({ status: "rejected", adminNote: input.note }).where(eq(orders.id, order.id));
        await db.insert(orderEvents).values({ orderId: order.id, status: "rejected", note: input.note });
      } else {
        await releasePurchase(purchase, order, "refunded", input.note);
      }
      return { ok: true, status: "refunded" as const };
    }),

  /** Cancel a stale checkout — the listing goes back on the market. */
  cancelPurchase: adminQuery
    .input(z.object({ publicId: z.string(), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      const { purchase, order } = found;
      if (!["awaiting_payment", "payment_sent"].includes(purchase.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `A ${purchase.status} purchase cannot be cancelled.`,
        });
      }
      await releasePurchase(purchase, order, "cancelled", input.note);
      return { ok: true, status: "cancelled" as const };
    }),

  /** Dispute resolved in the seller's favour — trade closes, payout fires now. */
  resolveRelease: adminQuery
    .input(z.object({ publicId: z.string(), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      await requireTwoFactor(ctx);
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.purchase.status !== "disputed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only disputed purchases can be resolved." });
      }
      await completePurchase(found.purchase, found.order, input.note);
      if (getPayments().mode === "auto") {
        // The frozen payout becomes due immediately; the sweeper fires it.
        await schedulePayout(found.purchase, new Date());
      } else {
        await clearPayoutHold(found.purchase);
      }
      return { ok: true, status: "completed" as const };
    }),

  /** Quick stats for the console header. */
  stats: adminQuery.query(async ({ ctx }) => {
    await requireTwoFactor(ctx);
    const all = await listOrders();
    const purchasesAll = await listPurchases();
    return {
      activeListings: all.filter((o) => o.status === "active").length,
      pendingReview: all.filter((o) => o.status === "submitted" || o.status === "verifying").length,
      awaitingConfirm: purchasesAll.filter((r) => r.purchase.status === "payment_sent").length,
      disputes: purchasesAll.filter((r) => r.purchase.status === "disputed").length,
    };
  }),
});
