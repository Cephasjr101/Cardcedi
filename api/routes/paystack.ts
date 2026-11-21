import { Hono } from "hono";
import { getPayments, verifyPaystackSignature } from "../lib/payments";
import { settlePurchase } from "../lib/settlement";
import { findPurchaseWithOrder } from "../queries/purchases";
import { log } from "../lib/logger";

/**
 * Paystack webhook receiver — mounted at /api/webhooks/paystack in boot.ts.
 * Set this URL in the Paystack dashboard (Settings → API Keys & Webhooks).
 * Every event is HMAC-verified against PAYSTACK_SECRET_KEY before it is trusted.
 */
export const paystackWebhook = new Hono();

paystackWebhook.post("/", async (c) => {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || getPayments().mode !== "auto") {
    return c.json({ error: "Payments webhook is not configured." }, 404);
  }

  const raw = await c.req.text();
  const signature = c.req.header("x-paystack-signature");
  if (!verifyPaystackSignature(raw, signature, secret)) {
    log.warn("paystack webhook: bad signature");
    return c.json({ error: "Invalid signature." }, 401);
  }

  let event: { event?: string; data?: { reference?: string; metadata?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return c.json({ error: "Bad payload." }, 400);
  }

  if (event.event === "charge.success") {
    // The purchase id is set as the charge reference at checkout.
    const purchaseId =
      (event.data?.metadata?.purchaseId as string | undefined) ?? event.data?.reference;
    if (purchaseId) {
      const found = await findPurchaseWithOrder(purchaseId.toUpperCase());
      if (found && ["awaiting_payment", "payment_sent"].includes(found.purchase.status)) {
        await settlePurchase(found.purchase, found.order, "Paystack charge.success");
        log.info("paystack webhook: purchase confirmed", { purchase: purchaseId });
      }
    }
  }

  // Always 200 for known events — otherwise Paystack retries forever.
  return c.json({ ok: true });
});
