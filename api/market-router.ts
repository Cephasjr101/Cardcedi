import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { storage } from "./lib/storage";
import { listActiveListings } from "./queries/orders";
import {
  findPurchaseWithOrder,
  listPurchaseEvents,
  reserveAndCreatePurchase,
  releasePurchase,
  setPurchaseStatus,
  completePurchase,
  disputePurchase,
} from "./queries/purchases";
import { getPayments } from "./lib/payments";
import { log } from "./lib/logger";
import {
  buyerPricePesewas,
  feePesewas,
  GHANA_PHONE_RE,
  PLATFORM_ACCOUNT,
  type MarketListing,
  type TrackedPurchase,
} from "@contracts/catalog";

const PURCHASE_ID_RE = /^PU-[A-Z2-9]{6}$/i;
const ORDER_ID_RE = /^CC-[A-Z2-9]{6}$/i;

async function toTrackedPurchase(publicId: string): Promise<TrackedPurchase> {
  const found = await findPurchaseWithOrder(publicId.toUpperCase());
  if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "No purchase with that ID." });
  const { purchase, order } = found;
  const events = await listPurchaseEvents(purchase.id);
  const codeVisible = purchase.status === "confirmed" || purchase.status === "completed" || purchase.status === "disputed";
  return {
    publicId: purchase.publicId,
    status: purchase.status,
    brandId: order.brandId,
    amountUsdCents: order.amountUsdCents,
    pricePesewas: purchase.pricePesewas,
    sellerPayoutPesewas: order.payoutPesewas,
    feePesewas: purchase.pricePesewas - order.payoutPesewas,
    sellerNetwork: order.network,
    sellerPhone: order.phone,
    sellerAccountName: order.accountName,
    orderPublicId: order.publicId,
    paymentMode: getPayments().mode,
    cardCode: codeVisible ? order.cardCode : null,
    adminNote: purchase.status === "disputed" || purchase.status === "refunded" ? purchase.adminNote : null,
    confirmedAt: purchase.confirmedAt,
    disputeDeadlineAt: purchase.disputeDeadlineAt,
    payoutDueAt: purchase.payoutDueAt,
    payoutStatus: purchase.payoutStatus,
    disputedAt: purchase.disputedAt,
    hasDisputeProof: !!purchase.disputeProofKey,
    createdAt: purchase.createdAt,
    events: events.map((e) => ({ status: e.status, note: e.note, createdAt: e.createdAt })),
  };
}

export const marketRouter = createRouter({
  /** Live listings for the marketplace grid. */
  listings: publicQuery.query(async (): Promise<MarketListing[]> => {
    const rows = await listActiveListings();
    return rows.map((o) => ({
      publicId: o.publicId,
      brandId: o.brandId,
      amountUsdCents: o.amountUsdCents,
      pricePesewas: buyerPricePesewas(o.payoutPesewas),
      sellerPayoutPesewas: o.payoutPesewas,
      feePesewas: feePesewas(o.payoutPesewas),
      createdAt: o.createdAt,
    }));
  }),

  /** Platform fee account details shown at checkout. */
  paymentInfo: publicQuery.query(() => PLATFORM_ACCOUNT),

  /** Buyer checks out a listing — atomically reserves it. */
  buy: publicQuery
    .input(
      z.object({
        orderPublicId: z.string().trim().regex(ORDER_ID_RE, "Listing IDs look like CC-7K2QX9."),
        buyerName: z.string().trim().min(2).max(120),
        buyerPhone: z.string().regex(GHANA_PHONE_RE, "Enter a 10-digit Ghana number starting with 0."),
        buyerNetwork: z.enum(["mtn", "telecel", "airteltigo"]),
      }),
    )
    .mutation(async ({ input }) => {
      // price is computed server-side from the listing, never from the client
      const listing = (await listActiveListings()).find(
        (o) => o.publicId === input.orderPublicId.toUpperCase(),
      );
      if (!listing) {
        throw new TRPCError({ code: "CONFLICT", message: "That card was just snapped up — pick another." });
      }
      const result = await reserveAndCreatePurchase({
        orderPublicId: listing.publicId,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        buyerNetwork: input.buyerNetwork,
        pricePesewas: buyerPricePesewas(listing.payoutPesewas),
      });
      if (!result) {
        throw new TRPCError({ code: "CONFLICT", message: "That card was just snapped up — pick another." });
      }

      const payments = getPayments();
      if (payments.mode === "auto") {
        // Gateway mode: one MoMo charge for the total. The webhook releases the
        // code and fires the seller's 90% transfer; the 10% stays in our balance.
        try {
          const charge = await payments.chargeMoMo({
            amountPesewas: result.purchase.pricePesewas,
            phone: input.buyerPhone,
            network: input.buyerNetwork,
            reference: result.purchase.publicId,
            metadata: { purchaseId: result.purchase.publicId },
          });
          return {
            publicId: result.purchase.publicId,
            mode: "auto" as const,
            chargeStatus: charge.status,
            displayText: charge.displayText,
            pricePesewas: result.purchase.pricePesewas,
            brandId: result.order.brandId,
            amountUsdCents: result.order.amountUsdCents,
          };
        } catch (error) {
          // Charge never reached the buyer's phone — free the listing again.
          log.warn("buyer charge failed", {
            purchase: result.purchase.publicId,
            error: error instanceof Error ? error.message : String(error),
          });
          await releasePurchase(result.purchase, result.order, "cancelled", "MoMo charge failed");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "We couldn't send the MoMo prompt to that number — check it and try again.",
          });
        }
      }

      // Manual mode: buyer sends 90% to the seller and 10% to the platform account.
      return {
        publicId: result.purchase.publicId,
        mode: "manual" as const,
        pricePesewas: result.purchase.pricePesewas,
        sellerPayoutPesewas: listing.payoutPesewas,
        feePesewas: feePesewas(listing.payoutPesewas),
        sellerNetwork: listing.network,
        sellerPhone: listing.phone,
        sellerAccountName: listing.accountName,
        brandId: result.order.brandId,
        amountUsdCents: result.order.amountUsdCents,
      };
    }),

  /** Buyer confirms they have sent both MoMo transfers. */
  markSent: publicQuery
    .input(z.object({ publicId: z.string().trim().regex(PURCHASE_ID_RE) }))
    .mutation(async ({ input }) => {
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.purchase.status !== "awaiting_payment") {
        return { ok: true, status: found.purchase.status };
      }
      await setPurchaseStatus(found.purchase, "payment_sent");
      return { ok: true, status: "payment_sent" as const };
    }),

  /** Public purchase tracking — the code appears once payment confirms. */
  track: publicQuery
    .input(z.object({ publicId: z.string().trim().regex(PURCHASE_ID_RE, "Purchase IDs look like PU-9XK2QW.") }))
    .query(({ input }) => toTrackedPurchase(input.publicId)),

  /** Buyer: the card redeemed fine — close the trade. */
  confirmRedeemed: publicQuery
    .input(z.object({ publicId: z.string().trim().regex(PURCHASE_ID_RE) }))
    .mutation(async ({ input }) => {
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.purchase.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The code isn't released yet." });
      }
      await completePurchase(found.purchase, found.order);
      return { ok: true, status: "completed" as const };
    }),

  /** Buyer: something is wrong with the card — open a dispute (proof required). */
  uploadProof: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(120),
        contentBase64: z.string().max(Math.ceil(5 * 1024 * 1024 * 1.4) + 64),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
      }),
    )
    .mutation(async ({ input }) => {
      const bytes = Uint8Array.from(Buffer.from(input.contentBase64, "base64"));
      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Proof image must be under 5 MB." });
      }
      const safeName = input.name.replace(/[^\w.\- ]+/g, "_").slice(-60) || "proof.jpg";
      const saved = await storage.uploadFile({
        fileContent: bytes,
        fileName: `disputes/${Date.now()}-${safeName}`,
        contentType: input.contentType,
      });
      return { key: saved.key };
    }),

  reportProblem: publicQuery
    .input(
      z.object({
        publicId: z.string().trim().regex(PURCHASE_ID_RE),
        note: z.string().trim().min(10).max(500),
        proofKey: z.string().trim().min(1).max(600),
      }),
    )
    .mutation(async ({ input }) => {
      const found = await findPurchaseWithOrder(input.publicId.toUpperCase());
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      const { purchase } = found;
      if (purchase.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can only report a problem after the code is released." });
      }
      const deadline = purchase.disputeDeadlineAt;
      if (!deadline || deadline.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The 9-minute reporting window has closed for this purchase.",
        });
      }
      await disputePurchase(purchase, { note: input.note, proofKey: input.proofKey, disputedAt: new Date() });
      return { ok: true, status: "disputed" as const };
    }),
});
