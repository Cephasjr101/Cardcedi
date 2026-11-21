/**
 * Shared gift-card catalog — single source of truth for the frontend
 * (rates table, calculator) and the backend (order validation, payout
 * computation). Money is handled in integer minor units server-side;
 * the display helpers here use major units for the UI.
 */

export interface CardBrand {
  id: string
  name: string
  short: string
  /** GHS paid per $1 of face value */
  rate: number
  minUsd: number
  maxUsd: number
  speed: string
  tag?: string
  /** brand colors for the CSS card art */
  ink: string
  paper: string
}

/** Indicative mid-market reference used for the percentage readout. */
export const FX_REFERENCE = 15.2

export const CARD_BRANDS: CardBrand[] = [
  { id: 'amazon', name: 'Amazon', short: 'AMZ', rate: 9.8, minUsd: 10, maxUsd: 2000, speed: '~12 min', tag: 'Best rate', ink: '#FAF7F1', paper: '#232F3E' },
  { id: 'visa', name: 'Visa Prepaid', short: 'VISA', rate: 10.2, minUsd: 25, maxUsd: 1000, speed: '~15 min', tag: 'Premium', ink: '#FAF7F1', paper: '#1A1F71' },
  { id: 'apple', name: 'Apple / iTunes', short: 'APL', rate: 9.4, minUsd: 10, maxUsd: 1500, speed: '~12 min', ink: '#FAF7F1', paper: '#1D1D1F' },
  { id: 'steam', name: 'Steam', short: 'STM', rate: 9.1, minUsd: 10, maxUsd: 1000, speed: '~15 min', ink: '#FAF7F1', paper: '#171A21' },
  { id: 'googleplay', name: 'Google Play', short: 'GP', rate: 8.9, minUsd: 10, maxUsd: 1000, speed: '~15 min', ink: '#FAF7F1', paper: '#0F9D58' },
  { id: 'razer', name: 'Razer Gold', short: 'RZR', rate: 8.8, minUsd: 10, maxUsd: 800, speed: '~20 min', ink: '#0E0E0E', paper: '#B8E62E' },
  { id: 'xbox', name: 'Xbox', short: 'XBX', rate: 8.6, minUsd: 15, maxUsd: 800, speed: '~20 min', ink: '#FAF7F1', paper: '#107C10' },
  { id: 'playstation', name: 'PlayStation', short: 'PSN', rate: 8.6, minUsd: 15, maxUsd: 800, speed: '~20 min', ink: '#FAF7F1', paper: '#00439C' },
  { id: 'walmart', name: 'Walmart', short: 'WMT', rate: 8.4, minUsd: 15, maxUsd: 1000, speed: '~25 min', ink: '#FAF7F1', paper: '#0071CE' },
  { id: 'ebay', name: 'eBay', short: 'EBY', rate: 8.2, minUsd: 15, maxUsd: 800, speed: '~25 min', ink: '#FAF7F1', paper: '#E53238' },
  { id: 'sephora', name: 'Sephora', short: 'SEP', rate: 7.9, minUsd: 15, maxUsd: 500, speed: '~30 min', ink: '#FAF7F1', paper: '#2A2A2A' },
  { id: 'netflix', name: 'Netflix', short: 'NFX', rate: 7.5, minUsd: 15, maxUsd: 500, speed: '~30 min', ink: '#FAF7F1', paper: '#B00610' },
]

export function findBrand(id: string | null | undefined): CardBrand | undefined {
  return CARD_BRANDS.find((b) => b.id === id)
}

/** Payout in GHS major units for the UI. */
export function payoutFor(brand: CardBrand, usd: number): number {
  return Math.round(brand.rate * usd * 100) / 100
}

export function pctOfFace(brand: CardBrand): number {
  return Math.round((brand.rate / FX_REFERENCE) * 100)
}

/** Pesewas paid per $1 of face value (integer). */
export function ratePesewasPerUsd(brand: CardBrand): number {
  return Math.round(brand.rate * 100)
}

/** Payout in pesewas (integer minor units) — what the DB stores. */
export function payoutPesewasFor(brand: CardBrand, usdCents: number): number {
  return Math.round((ratePesewasPerUsd(brand) * usdCents) / 100)
}

export const AMOUNT_PRESETS = [25, 50, 100, 200, 500]

export interface PayoutNetwork {
  id: string
  name: string
  hint: string
  ink: string
  paper: string
}

export const PAYOUT_NETWORKS: PayoutNetwork[] = [
  { id: 'mtn', name: 'MTN MoMo', hint: 'Instant to your MTN wallet', ink: '#1E1E1E', paper: '#FFCC08' },
  { id: 'telecel', name: 'Telecel Cash', hint: 'Instant to your Telecel wallet', ink: '#FAF7F1', paper: '#E30613' },
  { id: 'airteltigo', name: 'AirtelTigo', hint: 'Instant to your AT wallet', ink: '#FAF7F1', paper: '#123E7C' },
]

export const PAYOUT_NETWORK_IDS = PAYOUT_NETWORKS.map((n) => n.id) as [string, ...string[]]

export const ORDER_STATUSES = [
  'submitted',   // seller listed, awaiting review
  'verifying',   // admin is checking the card
  'active',      // verified and live on the market
  'reserved',    // a buyer has checked out — held while they pay
  'sold',        // buyer paid; code released; awaiting settlement
  'paid',        // seller received their cedis — final
  'rejected',    // card failed verification — final
  'delisted',    // pulled from the market by admin — final
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PURCHASE_STATUSES = [
  'awaiting_payment', // buyer checked out, has not paid yet
  'payment_sent',     // buyer tapped "I've sent it"
  'confirmed',        // admin confirmed both payments arrived — code released
  'completed',        // buyer redeemed the card — final (seller already paid direct)
  'disputed',         // buyer reported a problem
  'refunded',         // buyer got their money back — final
  'cancelled',        // abandoned / cancelled before payment — final
] as const
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

/** Platform commission: 10% of the seller's payout, paid by the buyer on top. */
export const COMMISSION_RATE = 0.1
export const COMMISSION_PCT = 10

/**
 * Buyer protection window: once payment is confirmed the code unlocks and the
 * buyer has this long to test the card and report a problem (with proof).
 */
export const DISPUTE_WINDOW_MINUTES = 9
/**
 * Seller payout hold: the seller's money is released this many minutes after
 * payment confirmation — one minute after the dispute window closes.
 */
export const PAYOUT_DELAY_MINUTES = 10

/** Where the seller payout stands (auto/gateway mode; manual pays directly). */
export type PayoutStatus = 'not_required' | 'scheduled' | 'sent' | 'failed' | 'frozen'

/** CardCedi's fee in pesewas for a card the seller gets `sellerPayoutPesewas` for. */
export function feePesewas(sellerPayoutPesewas: number): number {
  return Math.round(sellerPayoutPesewas * COMMISSION_RATE)
}

/** Buyer total in pesewas = seller payout (paid direct to seller) + 10% fee (paid to admin). */
export function buyerPricePesewas(sellerPayoutPesewas: number): number {
  return sellerPayoutPesewas + feePesewas(sellerPayoutPesewas)
}

/**
 * The admin MoMo account that collects the 10% platform fee.
 * The other 90% goes straight from the buyer to the seller's own wallet.
 * Live business wallet (MTN) — confirmed by the owner.
 */
export const PLATFORM_ACCOUNT = {
  network: 'mtn',
  networkName: 'MTN MoMo',
  number: '055 193 4922',
  name: 'CardCedi Commission',
}

/** Public order id: CC- + 6 unambiguous chars. */
export const PUBLIC_ID_PREFIX = 'CC-'

export const GHANA_PHONE_RE = /^0\d{9}$/

export function maskPhone(phone: string): string {
  return phone.length >= 7 ? `${phone.slice(0, 3)}•••${phone.slice(-4)}` : phone
}

/** The public tracking payload — never includes the full card code. */
export interface TrackedOrder {
  publicId: string
  brandId: string
  amountUsdCents: number
  payoutPesewas: number
  network: string
  phoneMasked: string
  codeLast4: string
  status: OrderStatus
  adminNote: string | null
  createdAt: Date
  events: { status: OrderStatus; note: string | null; createdAt: Date }[]
}

/** A live listing as shown on the public market — no code, no seller PII. */
/** How money moves: gateway-charged ("auto") or manual MoMo transfers ("manual"). */
export type PaymentMode = 'auto' | 'manual'

export interface MarketListing {
  publicId: string
  brandId: string
  amountUsdCents: number
  /** Buyer total = seller payout + 10% fee. */
  pricePesewas: number
  /** The 90% that goes straight to the seller. */
  sellerPayoutPesewas: number
  /** The 10% platform fee. */
  feePesewas: number
  createdAt: Date
}

/** Public purchase-tracking payload. Card code appears only after payment confirms. */
export interface TrackedPurchase {
  publicId: string
  status: PurchaseStatus
  brandId: string
  amountUsdCents: number
  /** Buyer total = seller payout + 10% fee. */
  pricePesewas: number
  /** What the buyer sends straight to the seller's MoMo. */
  sellerPayoutPesewas: number
  /** What the buyer sends to the platform account (10%). */
  feePesewas: number
  sellerNetwork: string
  sellerPhone: string
  sellerAccountName: string
  orderPublicId: string
  /** Whether this purchase is gateway-charged or manual-transfer. */
  paymentMode: PaymentMode
  cardCode: string | null
  adminNote: string | null
  /** When payment confirmed and the code unlocked (null before). */
  confirmedAt: Date | null
  /** Buyer may report a bad card until this moment (null before confirmation). */
  disputeDeadlineAt: Date | null
  /** Seller payout releases at/after this moment (null before confirmation). */
  payoutDueAt: Date | null
  payoutStatus: PayoutStatus
  disputedAt: Date | null
  /** A proof image was attached to the dispute. */
  hasDisputeProof: boolean
  createdAt: Date
  events: { status: PurchaseStatus; note: string | null; createdAt: Date }[]
}
