import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, BadgeCheck, Copy, Landmark, Loader2, ShieldCheck } from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import {
  COMMISSION_PCT,
  DISPUTE_WINDOW_MINUTES,
  PAYOUT_DELAY_MINUTES,
  PAYOUT_NETWORKS,
  PLATFORM_ACCOUNT,
  findBrand,
  ghsFromPesewas,
  usdFromCents,
} from '../lib/data'
import { trpc } from '@/providers/trpc'
import { usePageTitle } from '../hooks/usePageTitle'

type Errors = Partial<Record<'phone' | 'name', string>>

type BuyResult =
  | {
      mode: 'auto'
      publicId: string
      chargeStatus: string
      displayText: string | null
      pricePesewas: number
      brandId: string
      amountUsdCents: number
    }
  | {
      mode: 'manual'
      publicId: string
      pricePesewas: number
      sellerPayoutPesewas: number
      feePesewas: number
      sellerNetwork: string
      sellerPhone: string
      sellerAccountName: string
      brandId: string
      amountUsdCents: number
    }

function networkName(id: string) {
  return PAYOUT_NETWORKS.find((n) => n.id === id)?.name ?? id
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-cream/10 text-cream transition-colors hover:bg-cream/20"
    >
      {copied ? <BadgeCheck size={18} /> : <Copy size={18} />}
    </button>
  )
}

export default function Buy() {
  usePageTitle('Checkout')
  const [params] = useSearchParams()
  const orderId = params.get('id') ?? ''

  const listings = trpc.market.listings.useQuery()
  const listing = useMemo(
    () => (listings.data ?? []).find((l) => l.publicId === orderId.toUpperCase()),
    [listings.data, orderId],
  )

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [networkId, setNetworkId] = useState('mtn')
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState<BuyResult | null>(null)
  const [sentMarked, setSentMarked] = useState(false)

  const buy = trpc.market.buy.useMutation()
  const markSent = trpc.market.markSent.useMutation()

  const brand = listing ? findBrand(listing.brandId) : null

  const submit = async () => {
    if (!listing) return
    const next: Errors = {}
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) {
      next.phone = 'Enter a valid Ghana number, e.g. 0551234567.'
    }
    if (name.trim().length < 2) {
      next.name = 'We need a name for the payment record.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setSubmitError(null)
    try {
      const res = await buy.mutateAsync({
        orderPublicId: listing.publicId,
        buyerName: name.trim(),
        buyerPhone: phone.replace(/\s/g, ''),
        buyerNetwork: networkId as 'mtn' | 'telecel' | 'airteltigo',
      })
      setDone(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong — please try again.')
    }
  }

  /* ---------- payment step ---------- */
  if (done && brand && listing) {
    return (
      <PaymentStep
        done={done}
        sentMarked={sentMarked}
        onMarkSent={async () => {
          await markSent.mutateAsync({ publicId: done.publicId })
          setSentMarked(true)
        }}
        marking={markSent.isPending}
      />
    )
  }

  /* ---------- checkout ---------- */
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">Buy a card</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[44px]">
        Checkout.
      </h1>

      {listings.isPending ? (
        <p className="mt-10 font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Loading the listing…</p>
      ) : !listing || !brand ? (
        <div className="mt-8 rounded-3xl border border-dashed border-espresso/25 bg-creamdeep/60 p-10 text-center">
          <p className="font-display text-[24px] font-semibold text-espresso">That card is gone.</p>
          <p className="mt-2 font-sans text-[14.5px] text-cocoa">
            It was sold or delisted. The market moves fast — grab another one.
          </p>
          <Link to="/market" className="btn-primary mt-6 inline-flex">
            <ArrowLeft size={16} aria-hidden="true" /> Back to the market
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-8">
          <div className="flex items-center gap-5">
            <GiftCardArt brand={brand} usd={listing.amountUsdCents / 100} compact className="!w-36 shrink-0 !rounded-xl" />
            <div>
              <p className="font-sans text-[17px] font-semibold text-espresso">
                {brand.name} · {usdFromCents(listing.amountUsdCents)}
              </p>
              <p className="mt-1 font-mono text-[13.5px] text-cocoa">{listing.publicId} · verified listing</p>
              <p className="mt-2 font-mono text-[22px] text-espresso">{ghsFromPesewas(listing.pricePesewas)}</p>
              <p className="mt-1 font-sans text-[12.5px] text-cocoa">
                {ghsFromPesewas(listing.sellerPayoutPesewas)} goes straight to the seller ·{' '}
                {ghsFromPesewas(listing.feePesewas)} ({COMMISSION_PCT}%) CardCedi fee
              </p>
            </div>
          </div>

          <div className="my-6 h-px bg-espresso/10" aria-hidden="true" />

          <p className="field-label">Pay from which network?</p>
          <div className="grid gap-3" role="radiogroup" aria-label="Your mobile money network">
            {PAYOUT_NETWORKS.map((n) => (
              <button
                key={n.id}
                type="button"
                role="radio"
                aria-checked={n.id === networkId}
                onClick={() => setNetworkId(n.id)}
                className={`flex min-h-[52px] cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-2.5 text-left transition-all duration-200 ${
                  n.id === networkId
                    ? 'border-brand bg-brand/5'
                    : 'border-espresso/15 bg-transparent hover:border-espresso/40'
                }`}
              >
                <span
                  className="grid h-9 w-13 shrink-0 place-items-center rounded-lg px-2 font-sans text-[11px] font-bold uppercase tracking-wide"
                  style={{ background: n.paper, color: n.ink }}
                  aria-hidden="true"
                >
                  {n.name.split(' ')[0]}
                </span>
                <span className="font-sans text-[15px] font-semibold text-espresso">{n.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="buy-phone" className="field-label">Your MoMo number</label>
              <input
                id="buy-phone"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                className="field-line font-mono tracking-[0.06em]"
                placeholder="055 123 4567"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'buy-phone-error' : undefined}
              />
              {errors.phone && <p id="buy-phone-error" className="field-error" role="alert">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="buy-name" className="field-label">Your name</label>
              <input
                id="buy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-line"
                placeholder="Kofi Mensah"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'buy-name-error' : undefined}
              />
              {errors.name && <p id="buy-name-error" className="field-error" role="alert">{errors.name}</p>}
            </div>
          </div>

          {submitError && (
            <p className="mt-5 rounded-xl bg-brand/10 px-4 py-3 font-sans text-[14px] font-medium text-brand" role="alert">
              {submitError}{' '}
              <Link to="/market" className="underline underline-offset-2">Back to the market</Link>
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Link to="/market" className="btn-ghost">
              <ArrowLeft size={16} aria-hidden="true" /> Market
            </Link>
            <button type="button" onClick={submit} disabled={buy.isPending} className="btn-primary">
              {buy.isPending ? 'Reserving…' : `Reserve for ${ghsFromPesewas(listing.pricePesewas)}`}{' '}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- payment step (auto MoMo prompt, or manual two-transfer) ---------- */

function PaymentStep({
  done,
  sentMarked,
  onMarkSent,
  marking,
}: {
  done: BuyResult
  sentMarked: boolean
  onMarkSent: () => Promise<void>
  marking: boolean
}) {
  // In auto mode, poll until the webhook confirms the payment.
  const track = trpc.market.track.useQuery(
    { publicId: done.publicId },
    {
      enabled: done.mode === 'auto',
      refetchInterval: (q) =>
        q.state.data && ['confirmed', 'completed', 'disputed', 'refunded', 'cancelled'].includes(q.state.data.status)
          ? false
          : 4_000,
    },
  )
  const status = track.data?.status
  const paid = Boolean(status && ['confirmed', 'completed', 'disputed'].includes(status))

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:py-20">
      <div className="rounded-3xl border border-espresso/10 bg-white/60 p-7 shadow-lift md:p-10">
        <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-butter/30 text-espresso">
          <Landmark size={28} aria-hidden="true" />
        </span>

        {done.mode === 'auto' ? (
          <>
            <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight tracking-tight text-espresso md:text-[38px]">
              {paid ? (
                <>
                  Payment received.{' '}
                  <span className="font-script text-[1.3em] font-normal text-brand">Code unlocked.</span>
                </>
              ) : (
                <>
                  One step left:{' '}
                  <span className="font-script text-[1.3em] font-normal text-brand">approve on your phone.</span>
                </>
              )}
            </h1>
            <p className="mt-3 font-sans text-[15.5px] leading-relaxed text-cocoa">
              {paid ? (
                <>
                  The seller was paid directly — CardCedi kept only the {COMMISSION_PCT}% fee.
                  Your card code is ready on the tracking page.
                </>
              ) : (
                <>
                  We sent a MoMo approval request for{' '}
                  <strong className="text-espresso">{ghsFromPesewas(done.pricePesewas)}</strong> to your
                  phone.{done.displayText ? ` ${done.displayText}.` : ''} The moment you approve, the
                  seller is paid directly and your card code unlocks — nothing more to do.
                </>
              )}
            </p>

            {!paid && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-espresso px-5 py-4 text-cream">
                <Loader2 className="animate-spin" size={22} aria-hidden="true" />
                <div>
                  <p className="font-sans text-[14.5px] font-semibold">Waiting for your approval…</p>
                  <p className="font-mono text-[12.5px] text-cream/70">reference {done.publicId}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-[30px] font-semibold leading-tight tracking-tight text-espresso md:text-[38px]">
              Two quick transfers:{' '}
              <span className="font-script text-[1.3em] font-normal text-brand">seller, then fee.</span>
            </h1>
            <p className="mt-3 font-sans text-[15.5px] leading-relaxed text-cocoa">
              Send both from your MoMo with <strong className="text-espresso">{done.publicId}</strong> as
              the reference. You're charged before you ever see the code — the moment both transfers
              confirm, the code unlocks.
            </p>

            <ol className="mt-6 space-y-4">
              <li className="rounded-2xl bg-espresso p-5 text-cream">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-cream/60">
                      ① Pay the seller · {ghsFromPesewas(done.sellerPayoutPesewas)}
                    </p>
                    <p className="mt-1 font-mono text-[24px] tracking-[0.08em]">{done.sellerPhone}</p>
                    <p className="mt-0.5 font-sans text-[14px] font-semibold">
                      {done.sellerAccountName} · {networkName(done.sellerNetwork)}
                    </p>
                  </div>
                  <CopyButton value={done.sellerPhone} label="Copy seller number" />
                </div>
              </li>
              <li className="rounded-2xl bg-brand p-5 text-cream">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-cream/70">
                      ② CardCedi fee ({COMMISSION_PCT}%) · {ghsFromPesewas(done.feePesewas)}
                    </p>
                    <p className="mt-1 font-mono text-[24px] tracking-[0.08em]">{PLATFORM_ACCOUNT.number}</p>
                    <p className="mt-0.5 font-sans text-[14px] font-semibold">
                      {PLATFORM_ACCOUNT.name} · {PLATFORM_ACCOUNT.networkName}
                    </p>
                  </div>
                  <CopyButton value={PLATFORM_ACCOUNT.number.replace(/\s/g, '')} label="Copy fee account number" />
                </div>
              </li>
            </ol>

            <p className="mt-4 flex items-start gap-2 font-sans text-[13.5px] leading-snug text-cocoa">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-leaf" aria-hidden="true" />
              We hold the card code until both transfers are confirmed. Once it unlocks you have{' '}
              {DISPUTE_WINDOW_MINUTES} minutes to test it and report a bad card with proof —
              the seller's payout releases {PAYOUT_DELAY_MINUTES} minutes after confirmation.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={marking || sentMarked}
                onClick={onMarkSent}
                className="btn-primary flex-1"
              >
                {sentMarked ? 'Marked as sent' : marking ? 'Saving…' : "I've sent both"} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        <div className="mt-4">
          <Link to={`/purchase?id=${done.publicId}`} className="btn-ghost w-full">
            Track this purchase <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
