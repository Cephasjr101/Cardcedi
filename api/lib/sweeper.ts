import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { orders } from "@db/schema";
import {
  completePurchase,
  listDuePayouts,
  listWindowExpiredPurchases,
  markPayoutFailed,
  markPayoutSent,
} from "../queries/purchases";
import { getPayments } from "./payments";
import { sweepIntervalMs } from "./trade-window";
import { log } from "./logger";

/** Pesewas → "GH₵470.00" for admin notes. */
function ghs(pesewas: number): string {
  return `GH₵${(pesewas / 100).toFixed(2)}`;
}

/**
 * Trade closer + payout runner.
 *
 * Every tick:
 *  1. confirmed purchases whose dispute window elapsed with no report are
 *     auto-completed (purchase → completed, order → paid).
 *  2. due auto-mode payouts fire the Paystack transfer to the seller. A failed
 *     attempt is marked `failed` and retried on the next tick — the buyer's
 *     code is never taken back over a payout problem.
 *
 * Safe across restarts: everything is derived from DB timestamps, so a boot
 * after downtime simply sweeps whatever came due while we were away.
 */
export async function sweepOnce(): Promise<{ completed: number; payouts: number }> {
  const now = new Date();
  let completed = 0;
  let payouts = 0;

  const expired = await listWindowExpiredPurchases(now);
  for (const purchase of expired) {
    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.id, purchase.orderId));
    if (!order) continue;
    await completePurchase(purchase, order, "Auto-closed — the dispute window passed with no report.");
    completed += 1;
    log.info("trade auto-closed after dispute window", { purchase: purchase.publicId });
  }

  const payments = getPayments();
  if (payments.mode === "auto") {
    const due = await listDuePayouts(now);
    const db = getDb();
    for (const purchase of due) {
      const [order] = await db.select().from(orders).where(eq(orders.id, purchase.orderId));
      if (!order) continue;
      try {
        const transfer = await payments.paySeller({
          amountPesewas: order.payoutPesewas,
          phone: order.phone,
          network: order.network,
          accountName: order.accountName,
          reference: `SELL-${purchase.publicId}`,
        });
        await markPayoutSent(
          purchase,
          transfer.transferCode,
          `Seller auto-paid ${ghs(order.payoutPesewas)} via Paystack (ref ${transfer.transferCode}).`,
        );
        payouts += 1;
        log.info("seller payout sent", { purchase: purchase.publicId, transfer: transfer.transferCode });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markPayoutFailed(
          purchase,
          `AUTO-PAYOUT FAILED — pay the seller ${ghs(order.payoutPesewas)} manually. Retrying automatically. (${message})`,
        );
        log.warn("seller payout failed, will retry", { purchase: purchase.publicId, error: message });
      }
    }
  }

  return { completed, payouts };
}

/** Start the interval loop once per process (survives dev-server module reloads). */
export function startSweeper(): void {
  const globalRef = globalThis as { __cardcediSweeper?: ReturnType<typeof setInterval> };
  if (globalRef.__cardcediSweeper) return;
  globalRef.__cardcediSweeper = setInterval(() => {
    sweepOnce().catch((error) =>
      log.error("sweeper tick failed", { error: error instanceof Error ? error.message : String(error) }),
    );
  }, sweepIntervalMs());
  if (typeof globalRef.__cardcediSweeper === "object" && "unref" in globalRef.__cardcediSweeper) {
    globalRef.__cardcediSweeper.unref();
  }
  // catch up immediately on boot for anything that came due during downtime
  sweepOnce().catch((error) =>
    log.error("boot sweep failed", { error: error instanceof Error ? error.message : String(error) }),
  );
  log.info("trade sweeper started", { intervalMs: sweepIntervalMs() });
}
