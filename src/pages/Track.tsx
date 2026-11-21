import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CheckCircle2, CircleDashed, Search, Store, XCircle } from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import { PAYOUT_NETWORKS, findBrand, ghsFromPesewas, usdFromCents, type OrderStatus } from '../lib/data'
import { trpc } from '@/providers/trpc'
import { usePageTitle } from '../hooks/usePageTitle'

const STATUS_STEPS = [
  { id: 'submitted', title: 'Card received', body: 'Your card is in the verification queue.' },
  { id: 'active', title: 'Verified & live', body: 'Your card passed checks and is listed on the market.' },
  { id: 'sold', title: 'Sold — payout pending', body: 'A buyer paid. Your money releases about 10 minutes after their payment confirms, unless they report a bad card (they get 9 minutes to test it). We keep only a 10% fee.' },
] as const

/** Map the DB status onto the 3-step timeline (-1 = special banner). */
function stepIndex(status: OrderStatus): number {
  switch (status) {
    case 'submitted':
    case 'verifying':
      return 0
    case 'active':
    case 'reserved':
      return 1
    case 'sold':
      return 2
    case 'paid':
      return 3
    default:
      return -1
  }
}

function Timeline({ status }: { status: OrderStatus }) {
  const activeIdx = stepIndex(status)
  return (
    <ol className="mt-6 space-y-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {i < STATUS_STEPS.length - 1 && (
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
              {done || (active && status === 'paid') ? (
                <CheckCircle2 size={17} aria-hidden="true" />
              ) : (
                <CircleDashed size={17} aria-hidden="true" />
              )}
            </span>
            <div>
              <p
                className={`font-sans text-[15.5px] font-semibold ${
                  done || active ? 'text-espresso' : 'text-cocoa/70'
                }`}
              >
                {step.title}
              </p>
              <p className="mt-0.5 font-sans text-[13.5px] leading-snug text-cocoa">
                {step.id === 'active' && status === 'reserved'
                  ? 'A buyer is paying right now — hold tight.'
                  : step.body}
              </p>
              {active && status !== 'paid' && (
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

export default function Track() {
  usePageTitle('Track order')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(params.get('id') ?? '')
  const [tried, setTried] = useState(Boolean(params.get('id')))

  const lookupId = params.get('id') ?? ''

  /* PU- ids belong to the purchase tracker — send buyers there */
  useEffect(() => {
    if (lookupId.toUpperCase().startsWith('PU-')) {
      navigate(`/purchase?id=${lookupId.toUpperCase()}`, { replace: true })
    }
  }, [lookupId, navigate])

  const query = trpc.orders.track.useQuery(
    { publicId: lookupId },
    {
      enabled: Boolean(lookupId) && !lookupId.toUpperCase().startsWith('PU-'),
      retry: false,
      refetchInterval: (q) =>
        q.state.data && ['paid', 'rejected', 'delisted'].includes(q.state.data.status)
          ? false
          : 10_000,
    },
  )
  const order = query.data ?? null
  const notFound = tried && query.isFetched && !order

  /* keep the input box in sync when arriving via ?id= */
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

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">Track order</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[44px]">
        Where’s my{' '}
        <span className="font-script text-[1.3em] font-normal leading-none text-brand">money</span>?
      </h1>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          lookup(input)
        }}
      >
        <label htmlFor="track-id" className="sr-only">
          Order ID
        </label>
        <input
          id="track-id"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className="field-line flex-1 font-mono tracking-[0.12em]"
          placeholder="CC-XXXXXX"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary">
          <Search size={17} aria-hidden="true" /> Track
        </button>
      </form>

      {!lookupId && (
        <div className="mt-8 rounded-3xl border border-dashed border-espresso/25 bg-creamdeep/60 p-7 text-center">
          <p className="font-sans text-[15px] text-cocoa">
            No ID handy? Peek at a live sample order:
          </p>
          <button
            type="button"
            onClick={() => lookup('CC-7K2QX9')}
            className="mt-4 cursor-pointer rounded-full border border-espresso/25 bg-cream px-5 py-2.5 font-mono text-[15px] tracking-[0.12em] text-espresso transition-all duration-200 hover:border-espresso hover:bg-espresso hover:text-cream"
          >
            CC-7K2QX9
          </button>
        </div>
      )}

      {lookupId && query.isPending && (
        <p className="mt-8 font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">
          Checking the ledger…
        </p>
      )}

      {notFound && (
        <div className="mt-8 rounded-3xl border border-brand/30 bg-brand/5 p-7" role="alert">
          <p className="font-sans text-[16px] font-semibold text-espresso">
            We can’t find “{input}”.
          </p>
          <p className="mt-2 font-sans text-[14.5px] leading-relaxed text-cocoa">
            Check the ID and try again — it’s six letters and digits after the
            dash, e.g. CC-7K2QX9.
          </p>
        </div>
      )}

      {order && (
        <div className="mt-8 rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-8">
          <div className="flex items-center gap-5">
            <GiftCardArt brand={findBrand(order.brandId)} compact className="!w-32 shrink-0 !rounded-xl" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[15px] tracking-[0.12em] text-cocoa">
                {order.publicId}
              </p>
              <p className="mt-1 font-sans text-[17px] font-semibold text-espresso">
                {findBrand(order.brandId).name} · {usdFromCents(order.amountUsdCents)}
              </p>
              <p className="mt-0.5 font-mono text-[15px] text-espresso">
                {ghsFromPesewas(order.payoutPesewas)}{' '}
                <span className="font-sans text-[13px] text-cocoa">
                  → {PAYOUT_NETWORKS.find((n) => n.id === order.network)?.name}{' '}
                  {order.phoneMasked}
                </span>
              </p>
            </div>
          </div>
          <div className="my-6 h-px bg-espresso/10" aria-hidden="true" />
          {order.status === 'rejected' ? (
            <div className="rounded-2xl bg-brand/10 px-5 py-4">
              <p className="flex items-center gap-2 font-sans text-[15.5px] font-semibold text-brand">
                <XCircle size={18} aria-hidden="true" /> This card was declined
              </p>
              <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-espresso/80">
                {order.adminNote ?? 'The card did not pass verification.'} Nothing was charged — the
                card stays yours.
              </p>
            </div>
          ) : order.status === 'delisted' ? (
            <div className="rounded-2xl bg-espresso/5 px-5 py-4">
              <p className="flex items-center gap-2 font-sans text-[15.5px] font-semibold text-espresso">
                <Store size={18} aria-hidden="true" /> Listing removed
              </p>
              <p className="mt-1.5 font-sans text-[14px] text-cocoa">
                This card was taken off the market. Reach out on WhatsApp if this is a surprise.
              </p>
            </div>
          ) : (
            <Timeline status={order.status} />
          )}
          {order.status === 'paid' && (
            <p className="mt-4 rounded-2xl bg-leaf/10 px-4 py-3 font-sans text-[14px] font-medium text-leaf">
              Trade closed — the dispute window passed and your payout was released. Enjoy the cedis.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
