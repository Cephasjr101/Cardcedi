import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Copy,
  Flag,
  ImagePlus,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import {
  PLATFORM_ACCOUNT,
  COMMISSION_PCT,
  DISPUTE_WINDOW_MINUTES,
  PAYOUT_DELAY_MINUTES,
  findBrand,
  ghsFromPesewas,
  usdFromCents,
  type PaymentMode,
  type PurchaseStatus,
  type TrackedPurchase,
} from '../lib/data'
import { trpc } from '@/providers/trpc'
import { usePageTitle } from '../hooks/usePageTitle'

const STEPS: Record<PaymentMode, { id: string; title: string; body: string }[]> = {
  auto: [
    { id: 'awaiting_payment', title: 'Approve on your phone', body: 'We sent a MoMo approval request for the total — approve it and your code unlocks instantly.' },
    { id: 'payment_sent', title: 'Confirming payment', body: 'Your transfer came through — releasing your code now.' },
    { id: 'confirmed', title: 'Code released', body: `Payment confirmed. Test your card — you have ${DISPUTE_WINDOW_MINUTES} minutes to report a problem.` },
    { id: 'completed', title: 'Completed', body: `Trade closed. The seller was paid after the ${PAYOUT_DELAY_MINUTES}-minute safety hold. Enjoy!` },
  ],
  manual: [
    { id: 'awaiting_payment', title: 'Pay the seller + fee', body: 'Send the seller’s amount straight to their MoMo and the 10% fee to CardCedi — your purchase ID as reference for both.' },
    { id: 'payment_sent', title: 'Confirming payment', body: 'We are confirming both transfers with the seller — usually a few minutes.' },
    { id: 'confirmed', title: 'Code released', body: `Payments confirmed. Test your card — you have ${DISPUTE_WINDOW_MINUTES} minutes to report a problem.` },
    { id: 'completed', title: 'Completed', body: `Trade closed. The seller was paid after the ${PAYOUT_DELAY_MINUTES}-minute safety hold. Enjoy!` },
  ],
}

function Timeline({ status, mode }: { status: PurchaseStatus; mode: PaymentMode }) {
  const steps = STEPS[mode]
  const activeIdx = steps.findIndex((s) => s.id === status)
  return (
    <ol className="mt-6 space-y-0">
      {steps.map((step, i) => {
        const done = i < activeIdx || status === 'completed'
        const active = i === activeIdx && status !== 'completed'
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-[15px] top-8 h-full w-0.5 -translate-x-1/2 ${
                  done || active ? 'bg-brand' : 'bg-espresso/15'
                }`}
                aria-hidden="true"
              />
            )}
            <span
              className={`z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                done || active ? 'bg-brand text-cream' : 'bg-espresso/10 text-cocoa'
              }`}
            >
              {done ? <CheckCircle2 size={17} aria-hidden="true" /> : <CircleDashed size={17} aria-hidden="true" />}
            </span>
            <div>
              <p className={`font-sans text-[15.5px] font-semibold ${done || active ? 'text-espresso' : 'text-cocoa/70'}`}>
                {step.title}
              </p>
              <p className="mt-0.5 max-w-md font-sans text-[13.5px] leading-snug text-cocoa">{step.body}</p>
              {active && (
                <p className="mt-1.5 inline-block rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-brand">
                  In progress
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function Purchase() {
  usePageTitle('Track purchase')
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('id') ?? '')
  const [tried, setTried] = useState(Boolean(params.get('id')))
  const [copied, setCopied] = useState(false)

  const lookupId = params.get('id') ?? ''
  const query = trpc.market.track.useQuery(
    { publicId: lookupId },
    {
      enabled: Boolean(lookupId),
      retry: false,
      refetchInterval: (q) =>
        q.state.data && ['completed', 'refunded', 'cancelled'].includes(q.state.data.status)
          ? false
          : 5_000,
    },
  )
  const purchase = query.data ?? null
  const notFound = tried && query.isFetched && !purchase

  useEffect(() => {
    const id = params.get('id')
    if (id) {
      setInput(id.toUpperCase())
      setTried(true)
    }
  }, [params])

  const lookup = (id: string) => {
    const clean = id.trim().toUpperCase()
    if (!clean) return
    setInput(clean)
    setTried(true)
    setParams({ id: clean })
  }

  const brand = purchase ? findBrand(purchase.brandId) : null

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">Track purchase</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[44px]">
        Your card,{' '}
        <span className="font-script text-[1.3em] font-normal leading-none text-brand">step by step.</span>
      </h1>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          lookup(input)
        }}
      >
        <label htmlFor="purchase-id" className="sr-only">Purchase ID</label>
        <input
          id="purchase-id"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className="field-line flex-1 font-mono tracking-[0.12em]"
          placeholder="PU-XXXXXX"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary">
          <Search size={17} aria-hidden="true" /> Track
        </button>
      </form>

      {lookupId && query.isPending && (
        <p className="mt-8 font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Checking your purchase…</p>
      )}

      {notFound && (
        <div className="mt-8 rounded-3xl border border-brand/30 bg-brand/5 p-7" role="alert">
          <p className="font-sans text-[16px] font-semibold text-espresso">We can’t find “{input}”.</p>
          <p className="mt-2 font-sans text-[14.5px] leading-relaxed text-cocoa">
            Purchase IDs start with PU- and have six letters and digits after the dash.
          </p>
        </div>
      )}

      {purchase && brand && (
        <div className="mt-8 rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-8">
          <div className="flex items-center gap-5">
            <GiftCardArt brand={brand} usd={purchase.amountUsdCents / 100} compact className="!w-32 shrink-0 !rounded-xl" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[15px] tracking-[0.12em] text-cocoa">{purchase.publicId}</p>
              <p className="mt-1 font-sans text-[17px] font-semibold text-espresso">
                {brand.name} · {usdFromCents(purchase.amountUsdCents)}
              </p>
              <p className="mt-0.5 font-mono text-[15px] text-espresso">{ghsFromPesewas(purchase.pricePesewas)}</p>
            </div>
          </div>

          <div className="my-6 h-px bg-espresso/10" aria-hidden="true" />

          {purchase.status === 'cancelled' && (
            <div className="rounded-2xl bg-espresso/5 px-5 py-4">
              <p className="flex items-center gap-2 font-sans text-[15.5px] font-semibold text-espresso">
                <XCircle size={18} aria-hidden="true" /> This purchase was cancelled
              </p>
              <p className="mt-1.5 font-sans text-[14px] text-cocoa">
                The card is back on the market if you still want it.
              </p>
              <Link to="/market" className="btn-ghost mt-4 !min-h-[40px] !px-4 !py-2 text-[13.5px]">
                <RotateCcw size={15} aria-hidden="true" /> Back to the market
              </Link>
            </div>
          )}

          {purchase.status === 'refunded' && (
            <div className="rounded-2xl bg-leaf/10 px-5 py-4">
              <p className="flex items-center gap-2 font-sans text-[15.5px] font-semibold text-leaf">
                <BadgeCheck size={18} aria-hidden="true" /> Refunded
              </p>
              <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-espresso/80">
                {purchase.adminNote ?? 'Your money was returned.'} Check your MoMo wallet.
              </p>
            </div>
          )}

          {purchase.status === 'disputed' && (
            <div className="rounded-2xl bg-butter/30 px-5 py-4">
              <p className="flex items-center gap-2 font-sans text-[15.5px] font-semibold text-espresso">
                <Flag size={18} aria-hidden="true" /> Dispute under review
              </p>
              <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-espresso/80">
                A person is checking the card and the payment trail. The trade is
                frozen until this is resolved — you will not lose money over a bad card.
              </p>
            </div>
          )}

          {!['cancelled', 'refunded', 'disputed'].includes(purchase.status) && (
            <Timeline status={purchase.status} mode={purchase.paymentMode} />
          )}

          {/* payment instructions while money is moving */}
          {['awaiting_payment', 'payment_sent'].includes(purchase.status) && (
            <PaymentPanel purchase={purchase} />
          )}

          {/* code reveal */}
          {purchase.cardCode && ['confirmed', 'completed', 'disputed'].includes(purchase.status) && (
            <div className="mt-6 rounded-2xl bg-espresso p-5">
              <p className="font-sans text-[13px] text-cream/70">
                {brand.name} code · {usdFromCents(purchase.amountUsdCents)}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <code className="flex-1 select-all break-all font-mono text-[19px] tracking-[0.08em] text-cream">
                  {purchase.cardCode}
                </code>
                <button
                  type="button"
                  aria-label="Copy card code"
                  onClick={async () => {
                    await navigator.clipboard.writeText(purchase.cardCode!)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-cream/10 text-cream transition-colors hover:bg-cream/20"
                >
                  {copied ? <BadgeCheck size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* buyer actions after code release — inside the dispute window */}
          {purchase.status === 'confirmed' && <BuyerActions purchase={purchase} onChanged={() => query.refetch()} />}

          {purchase.status === 'completed' && (
            <p className="mt-4 rounded-2xl bg-leaf/10 px-4 py-3 font-sans text-[14px] font-medium text-leaf">
              Trade complete — thanks for buying on CardCedi.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- countdown + dispute form shown after the code unlocks ---------- */

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function BuyerActions({ purchase, onChanged }: { purchase: TrackedPurchase; onChanged: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeNote, setDisputeNote] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const deadlineMs = purchase.disputeDeadlineAt ? new Date(purchase.disputeDeadlineAt).getTime() : null
  const msLeft = deadlineMs === null ? 0 : deadlineMs - now
  const windowOpen = deadlineMs !== null && msLeft > 0

  const confirmRedeemed = trpc.market.confirmRedeemed.useMutation({
    onSuccess: onChanged,
    onError: (e) => setActionError(e.message),
  })
  const uploadProof = trpc.market.uploadProof.useMutation()
  const reportProblem = trpc.market.reportProblem.useMutation({
    onSuccess: () => {
      setDisputeOpen(false)
      onChanged()
    },
    onError: (e) => setActionError(e.message),
  })

  const busy = confirmRedeemed.isPending || uploadProof.isPending || reportProblem.isPending

  const submitDispute = async () => {
    setActionError(null)
    if (!proofFile) {
      setActionError('Attach a photo or screenshot as proof — we cannot review a report without it.')
      return
    }
    const note = disputeNote.trim()
    if (note.length < 10) {
      setActionError('Tell us a little more about what went wrong (at least 10 characters).')
      return
    }
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.readAsDataURL(proofFile)
      })
      const contentType = (['image/jpeg', 'image/png', 'image/webp'].includes(proofFile.type)
        ? proofFile.type
        : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
      const { key } = await uploadProof.mutateAsync({ name: proofFile.name, contentBase64: base64, contentType })
      await reportProblem.mutateAsync({ publicId: purchase.publicId, note, proofKey: key })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Something went wrong — try again.')
    }
  }

  if (!windowOpen) {
    // The sweeper closes the trade within seconds of the deadline — the page
    // keeps refetching and flips to "completed" on its own.
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-espresso/5 px-5 py-4">
        <Loader2 size={17} className="animate-spin text-cocoa" aria-hidden="true" />
        <p className="font-sans text-[14px] text-cocoa">
          The {DISPUTE_WINDOW_MINUTES}-minute reporting window has closed — finalising the trade…
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 border-t border-espresso/10 pt-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-butter/25 px-4 py-3">
        <p className="flex items-center gap-2 font-sans text-[13.5px] font-medium text-espresso">
          <Clock3 size={16} className="shrink-0 text-brand" aria-hidden="true" />
          Test the code now — time left to report a problem:
        </p>
        <p className="font-mono text-[17px] font-semibold tabular-nums text-brand" aria-live="polite">
          {formatCountdown(msLeft)}
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 font-sans text-[13.5px] leading-snug text-cocoa">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-leaf" aria-hidden="true" />
        Redeem the code first, then decide. After the window closes the trade
        auto-completes and the seller is paid at the {PAYOUT_DELAY_MINUTES}-minute mark.
        Reporting a problem freezes the payout while we investigate.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => confirmRedeemed.mutate({ publicId: purchase.publicId })}
          className="btn-primary flex-1"
        >
          <BadgeCheck size={16} aria-hidden="true" />
          {confirmRedeemed.isPending ? 'Confirming…' : 'Code works — close the trade'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDisputeOpen((v) => !v)}
          className="btn-ghost flex-1 !border-brand/40 !text-brand"
        >
          <Flag size={15} aria-hidden="true" /> Report a problem
        </button>
      </div>

      {disputeOpen && (
        <div className="mt-4 rounded-2xl border border-brand/25 bg-brand/5 p-4">
          <label htmlFor="dispute-note" className="field-label">What went wrong?</label>
          <textarea
            id="dispute-note"
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            rows={3}
            className="field-line w-full resize-none"
            placeholder="e.g. The code says it was already redeemed"
          />
          <label htmlFor="dispute-proof" className="field-label mt-4">
            Proof — photo or screenshot (required)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost !min-h-[42px] !px-4 !py-2 text-[13.5px]"
            >
              <ImagePlus size={16} aria-hidden="true" />
              {proofFile ? 'Change image' : 'Choose image'}
            </button>
            <p className="min-w-0 flex-1 truncate font-sans text-[13px] text-cocoa">
              {proofFile ? proofFile.name : 'Show the error you got when redeeming the card.'}
            </p>
          </div>
          <input
            ref={fileRef}
            id="dispute-proof"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy || disputeNote.trim().length < 10 || !proofFile}
            onClick={submitDispute}
            className="btn-primary mt-4"
          >
            {busy ? 'Sending…' : 'Open dispute — freezes the payout'}
          </button>
        </div>
      )}

      {actionError && (
        <p className="field-error mt-3" role="alert">{actionError}</p>
      )}
    </div>
  )
}

/* ---------- payment instructions shown while money is moving ---------- */

function PaymentPanel({ purchase }: { purchase: TrackedPurchase }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  if (purchase.paymentMode === 'auto') {
    return (
      <div className="mt-6 rounded-2xl bg-espresso p-5 text-cream">
        <p className="font-sans text-[14.5px] font-semibold">
          Approve the MoMo prompt on your phone — {ghsFromPesewas(purchase.pricePesewas)}
        </p>
        <p className="mt-1 font-sans text-[13px] leading-snug text-cream/75">
          {ghsFromPesewas(purchase.sellerPayoutPesewas)} goes straight to the seller and{' '}
          {ghsFromPesewas(purchase.feePesewas)} ({COMMISSION_PCT}%) is the CardCedi fee. Your code
          unlocks the moment the payment lands.
        </p>
        <p className="mt-3 border-t border-cream/15 pt-3 font-mono text-[12.5px] tracking-[0.1em] text-cream/60">
          reference {purchase.publicId}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-2xl bg-espresso p-5 text-cream">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-cream/60">
              ① Pay the seller · {ghsFromPesewas(purchase.sellerPayoutPesewas)}
            </p>
            <p className="mt-1 font-mono text-[22px] tracking-[0.08em]">{purchase.sellerPhone}</p>
            <p className="mt-0.5 font-sans text-[13.5px] font-semibold">
              {purchase.sellerAccountName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy seller number"
            onClick={() => copy('seller', purchase.sellerPhone)}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-cream/10 text-cream transition-colors hover:bg-cream/20"
          >
            {copiedKey === 'seller' ? <BadgeCheck size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>
      <div className="rounded-2xl bg-brand p-5 text-cream">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-cream/70">
              ② CardCedi fee ({COMMISSION_PCT}%) · {ghsFromPesewas(purchase.feePesewas)}
            </p>
            <p className="mt-1 font-mono text-[22px] tracking-[0.08em]">{PLATFORM_ACCOUNT.number}</p>
            <p className="mt-0.5 font-sans text-[13.5px] font-semibold">{PLATFORM_ACCOUNT.name}</p>
          </div>
          <button
            type="button"
            aria-label="Copy fee account number"
            onClick={() => copy('fee', PLATFORM_ACCOUNT.number.replace(/\s/g, ''))}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-cream/10 text-cream transition-colors hover:bg-cream/20"
          >
            {copiedKey === 'fee' ? <BadgeCheck size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>
      <p className="font-sans text-[13px] text-cocoa">
        Use <span className="font-mono text-espresso">{purchase.publicId}</span> as the reference for both transfers.
      </p>
    </div>
  )
}
