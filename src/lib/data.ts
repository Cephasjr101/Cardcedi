import { CARD_BRANDS, findBrand as findBrandStrict, type CardBrand } from '@contracts/catalog'

// Catalog + payout math are shared with the backend via @contracts/catalog.
export {
  CARD_BRANDS,
  FX_REFERENCE,
  payoutFor,
  pctOfFace,
  AMOUNT_PRESETS,
  PAYOUT_NETWORKS,
  maskPhone,
  buyerPricePesewas,
  feePesewas,
  COMMISSION_PCT,
  PLATFORM_ACCOUNT,
  DISPUTE_WINDOW_MINUTES,
  PAYOUT_DELAY_MINUTES,
  type CardBrand,
  type PayoutNetwork,
  type OrderStatus,
  type PurchaseStatus,
  type PaymentMode,
  type PayoutStatus,
  type TrackedOrder,
  type MarketListing,
  type TrackedPurchase,
} from '@contracts/catalog'

/** UI variant: unknown ids fall back to the first brand so widgets never break. */
export function findBrand(id: string | null | undefined): CardBrand {
  return findBrandStrict(id) ?? CARD_BRANDS[0]
}

export const GHS = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format integer minor units (pesewas / cents) with the locale formatters. */
export function ghsFromPesewas(pesewas: number): string {
  return GHS.format(pesewas / 100)
}

export function usdFromCents(cents: number): string {
  return USD.format(cents / 100)
}

export const HOW_STEPS = [
  {
    n: '01',
    title: 'Check your rate',
    body: 'Pick your card and amount. The cedi figure you see is locked the moment you submit — no slippage, no fees shaved off after.',
  },
  {
    n: '02',
    title: 'Send the card',
    body: 'Enter the code or upload a clear photo of the card and receipt. A human verifier checks balance and validity, then your card goes live on the market.',
  },
  {
    n: '03',
    title: 'Get paid when it sells',
    body: 'When a buyer pays, your money releases about 10 minutes after their payment confirms — the short hold gives the buyer 9 minutes to test the card and flag a bad one. We keep only a flat 10% fee.',
  },
]

export const TRUST_STATS = [
  { value: 'GH₵2.4M+', label: 'paid out to traders' },
  { value: '12 min', label: 'average payout time' },
  { value: '4.9 / 5', label: 'trader rating' },
]

export const TRUST_FEATURES = [
  {
    title: 'Rate locked at submission',
    body: 'Markets move, your payout doesn’t. The quote on your screen is the amount that hits your wallet.',
  },
  {
    title: 'Human verification',
    body: 'Every card is checked by a person, not a black box. If a card fails, you hear exactly why — and you keep it.',
  },
  {
    title: 'MoMo-native payouts',
    body: 'Built for Ghana first: MTN MoMo, Telecel Cash and AirtelTigo. No bank queues, no dollar accounts.',
  },
]

export const FAQS = [
  {
    q: 'How fast do I actually get paid?',
    a: 'Your card is verified and listed on the market — usually within minutes of submitting. When a buyer pays, the card code unlocks for them immediately and your payout releases about 10 minutes after their payment confirms; CardCedi keeps only a 10% fee. The short hold is buyer protection: they get 9 minutes to test the code and report a bad card with proof. Watch every step on the tracking page.',
  },
  {
    q: 'Which gift cards do you buy?',
    a: 'Amazon, Apple/iTunes, Google Play, Steam, Visa prepaid, Razer Gold, Xbox, PlayStation, Walmart, eBay, Sephora and Netflix — US-region cards in USD. The rates table lists the live buy rate for each.',
  },
  {
    q: 'How are rates set?',
    a: 'Rates follow the resale market for each card brand, minus our margin. The number you see in the calculator is locked when you submit — if the market moves while your card is being verified, that’s our problem, not yours.',
  },
  {
    q: 'Is this safe? What about scams?',
    a: 'Your card code is sent over an encrypted connection and is only ever visible to the human verifier handling your trade — never to other traders, and it stays locked until a buyer’s payment is confirmed. Buyers are charged before they ever see a code, get 9 minutes to report a bad card with photo proof, and every report is reviewed by a person. We never ask for your MoMo PIN or OTP — anyone who does is not us. Only trade through this site.',
  },
  {
    q: 'What are the minimum and maximum amounts?',
    a: 'Minimums start at $10 depending on the brand (check the rates table). For single trades above $500 we may ask for a quick ID check — a legal anti-fraud requirement, done once.',
  },
  {
    q: 'My card was declined. Now what?',
    a: 'You get a plain-language reason — wrong balance, already redeemed, wrong region — and the card stays yours. Nothing is deducted, nothing is charged.',
  },
]

export const TICKER_ITEMS = CARD_BRANDS.map(
  (b) => `${b.name} $1 → GH₵${b.rate.toFixed(2)}`,
)
