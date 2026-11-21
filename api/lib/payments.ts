import { createHmac } from "node:crypto";
import { log } from "./logger";

/**
 * Payments provider — moves real money.
 *
 * Two modes, chosen by environment:
 *   - "manual" (default): no gateway keys configured. Buyers send two MoMo
 *     transfers by hand (90% to the seller, 10% to the platform account) and
 *     an admin confirms arrival in the console.
 *   - "auto": PAYMENTS_PROVIDER=paystack with PAYSTACK_SECRET_KEY set. The
 *     buyer gets a MoMo approval prompt, the charge webhook releases the card
 *     code, and the seller's 90% is transferred straight to their MoMo. The
 *     10% fee stays in the platform's Paystack balance and settles to the
 *     business account automatically.
 *
 * Env (optional — absence means manual mode):
 *   PAYMENTS_PROVIDER=paystack
 *   PAYSTACK_SECRET_KEY=sk_live_or_test_...
 */

export type PaymentMode = "auto" | "manual";

export interface ChargeResult {
  reference: string;
  /** Paystack charge status: pending | pay_offline | send_otp | success | failed */
  status: string;
  /** e.g. "Dial *170# to approve the payment" — shown to the buyer when present. */
  displayText: string | null;
}

export interface TransferResult {
  transferCode: string;
  status: string;
}

export interface PaymentsProvider {
  mode: PaymentMode;
  /** Collect from the buyer's MoMo (request-to-pay / USSD prompt). */
  chargeMoMo(args: {
    amountPesewas: number;
    phone: string;
    network: string;
    reference: string;
    metadata: Record<string, unknown>;
  }): Promise<ChargeResult>;
  /** Send the seller's share straight to their MoMo. */
  paySeller(args: {
    amountPesewas: number;
    phone: string;
    network: string;
    accountName: string;
    reference: string;
  }): Promise<TransferResult>;
}

/** Internal network id → Paystack charge provider + transfer bank code. */
const NETWORK_CODES: Record<string, { charge: string; bank: string }> = {
  mtn: { charge: "mtn", bank: "MTN" },
  telecel: { charge: "vod", bank: "VOD" }, // Telecel = former Vodafone
  airteltigo: { charge: "atl", bank: "ATL" },
};

const API = "https://api.paystack.co";

class PaystackProvider implements PaymentsProvider {
  readonly mode = "auto" as const;
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { status: boolean; message?: string; data: T };
    if (!res.ok || !json.status) {
      throw new Error(json.message ?? `Paystack ${path} failed (${res.status})`);
    }
    return json.data;
  }

  async chargeMoMo(args: {
    amountPesewas: number;
    phone: string;
    network: string;
    reference: string;
    metadata: Record<string, unknown>;
  }): Promise<ChargeResult> {
    const codes = NETWORK_CODES[args.network];
    if (!codes) throw new Error(`Unsupported network ${args.network}`);
    const data = await this.call<{ reference: string; status: string; display_text?: string }>(
      "/charge",
      {
        amount: args.amountPesewas,
        currency: "GHS",
        // Paystack requires an email; buyers check out with a phone number, so
        // the purchase id stands in as a stable, unique address.
        email: `${args.reference.toLowerCase()}@buyers.cardcedi.com`,
        mobile_money: { phone: args.phone, provider: codes.charge },
        reference: args.reference,
        metadata: args.metadata,
      },
    );
    return {
      reference: data.reference,
      status: data.status,
      displayText: data.display_text ?? null,
    };
  }

  async paySeller(args: {
    amountPesewas: number;
    phone: string;
    network: string;
    accountName: string;
    reference: string;
  }): Promise<TransferResult> {
    const codes = NETWORK_CODES[args.network];
    if (!codes) throw new Error(`Unsupported network ${args.network}`);
    const recipient = await this.call<{ recipient_code: string }>("/transferrecipient", {
      type: "mobile_money",
      name: args.accountName,
      account_number: args.phone,
      bank_code: codes.bank,
      currency: "GHS",
    });
    const transfer = await this.call<{ transfer_code: string; status: string }>("/transfer", {
      source: "balance",
      amount: args.amountPesewas,
      recipient: recipient.recipient_code,
      reason: `CardCedi sale payout ${args.reference}`,
      reference: args.reference,
    });
    return { transferCode: transfer.transfer_code, status: transfer.status };
  }
}

class ManualProvider implements PaymentsProvider {
  readonly mode = "manual" as const;

  async chargeMoMo(): Promise<never> {
    throw new Error("Payments are in manual mode — no gateway configured.");
  }

  async paySeller(): Promise<never> {
    throw new Error("Payments are in manual mode — pay the seller from your own MoMo.");
  }
}

let instance: PaymentsProvider | null = null;

export function getPayments(): PaymentsProvider {
  if (!instance) {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (process.env.PAYMENTS_PROVIDER === "paystack" && secret) {
      instance = new PaystackProvider(secret);
      log.info("payments: Paystack (auto) mode");
    } else {
      instance = new ManualProvider();
      log.info("payments: manual mode (set PAYMENTS_PROVIDER=paystack + PAYSTACK_SECRET_KEY for automatic payouts)");
    }
  }
  return instance;
}

/** Verify x-paystack-signature against the raw request body. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return expected === signature;
}

/** Reset the cached provider (tests / config changes). */
export function resetPaymentsForTests(): void {
  instance = null;
}
