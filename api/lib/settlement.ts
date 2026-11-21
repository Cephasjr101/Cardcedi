import { confirmPurchase } from "../queries/purchases";
import { getPayments } from "./payments";
import { disputeWindowMs, payoutDelayMs } from "./trade-window";
import type { Order, Purchase } from "@db/schema";

/**
 * Confirm a purchase: release the card code, open the buyer's dispute window
 * and schedule the seller payout for when the window closes.
 *
 * - Manual mode: the buyer already sent 90% straight to the seller, so there is
 *   nothing to transfer — payout is `not_required`.
 * - Auto (Paystack) mode: the full amount sits in our Paystack balance; the
 *   sweeper transfers 90% to the seller at `payoutDueAt` (unless the buyer
 *   disputes first), the 10% fee stays behind.
 *
 * Used by BOTH the Paystack webhook and the admin "payments received" action.
 */
export async function settlePurchase(purchase: Purchase, order: Order, note?: string) {
  const now = new Date();
  const payments = getPayments();
  await confirmPurchase(purchase, order, {
    note,
    confirmedAt: now,
    disputeDeadlineAt: new Date(now.getTime() + disputeWindowMs()),
    payoutDueAt: new Date(now.getTime() + payoutDelayMs()),
    payoutStatus: payments.mode === "auto" ? "scheduled" : "not_required",
  });
}
