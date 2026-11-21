import { useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Clock,
  Copy,
  Flag,
  HandCoins,
  Loader2,
  LogOut,
  ShieldAlert,
  Store,
  Users,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { trpc } from '@/providers/trpc'
import GiftCardArt from '../components/GiftCardArt'
import { TwoFactorChallenge, TwoFactorSetup } from '../components/TwoFactorGate'
import {
  PAYOUT_NETWORKS,
  findBrand,
  ghsFromPesewas,
  usdFromCents,
  type OrderStatus,
  type PurchaseStatus,
} from '../lib/data'
import { usePageTitle } from '../hooks/usePageTitle'

/* ------------------------------ shared bits ------------------------------ */

const ORDER_STYLE: Record<OrderStatus, string> = {
  submitted: 'bg-butter/30 text-espresso',
  verifying: 'bg-brand/10 text-brand',
  active: 'bg-leaf/10 text-leaf',
  reserved: 'bg-butter/30 text-espresso',
  sold: 'bg-brand/10 text-brand',
  paid: 'bg-leaf text-cream',
  rejected: 'bg-espresso/10 text-cocoa',
  delisted: 'bg-espresso/10 text-cocoa',
}

const PURCHASE_STYLE: Record<PurchaseStatus, string> = {
  awaiting_payment: 'bg-butter/30 text-espresso',
  payment_sent: 'bg-brand/10 text-brand',
  confirmed: 'bg-leaf/10 text-leaf',
  completed: 'bg-leaf text-cream',
  disputed: 'bg-brand text-cream',
  refunded: 'bg-espresso/10 text-cocoa',
  cancelled: 'bg-espresso/10 text-cocoa',
}

const ORDER_FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'New' },
  { id: 'verifying', label: 'Verifying' },
  { id: 'active', label: 'Live' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'sold', label: 'Sold' },
  { id: 'paid', label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'delisted', label: 'Delisted' },
]

const PURCHASE_FILTERS: { id: PurchaseStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'awaiting_payment', label: 'Awaiting pay' },
  { id: 'payment_sent', label: 'Sent' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'cancelled', label: 'Cancelled' },
]

/** Seller-side actions per status (mirrors server rules). */
const ORDER_ACTIONS: Record<OrderStatus, { status: OrderStatus; label: string; tone: 'go' | 'stop' }[]> = {
  submitted: [
    { status: 'verifying', label: 'Start verifying', tone: 'go' },
    { status: 'rejected', label: 'Reject', tone: 'stop' },
  ],
  verifying: [
    { status: 'active', label: 'List on market', tone: 'go' },
    { status: 'rejected', label: 'Reject', tone: 'stop' },
  ],
  active: [{ status: 'delisted', label: 'Delist', tone: 'stop' }],
  reserved: [],
  sold: [],
  paid: [],
  rejected: [],
  delisted: [],
}

const networkName = (id: string) => PAYOUT_NETWORKS.find((n) => n.id === id)?.name ?? id

/* ------------------------------ page ------------------------------ */

export default function Admin() {
  usePageTitle('Admin console')
  const { user, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: LOGIN_PATH,
  })

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="animate-spin text-cocoa" size={28} aria-label="Loading" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <ShieldAlert className="mx-auto text-brand" size={36} aria-hidden="true" />
        <h1 className="mt-4 font-display text-[30px] font-semibold text-espresso">Staff only.</h1>
        <p className="mt-2 font-sans text-[15px] text-cocoa">
          This console manages real trades and real money. Sign in with the owner account to continue.
        </p>
      </div>
    )
  }

  return <TwoFactorGate userName={user.name ?? 'Admin'} onLogout={logout} />
}

/** Wraps the console: 2FA setup → challenge → console. */
function TwoFactorGate({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  const state = trpc.twofa.state.useQuery(undefined, { refetchInterval: 30_000, retry: false })

  if (state.isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="animate-spin text-cocoa" size={28} aria-label="Loading" />
      </div>
    )
  }
  if (state.data && !state.data.enabled) {
    return <TwoFactorSetup onDone={() => state.refetch()} onLogout={onLogout} />
  }
  if (state.data && !state.data.passed) {
    return <TwoFactorChallenge onDone={() => state.refetch()} onLogout={onLogout} />
  }
  return <AdminConsole userName={userName} onLogout={onLogout} />
}

function AdminConsole({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  const [tab, setTab] = useState<'sellers' | 'buyers'>('sellers')

  return (
    <div className="mx-auto max-w-shell px-5 py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">Back office</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight text-espresso md:text-[40px]">
            Marketplace console
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-sans text-[13.5px] text-cocoa sm:block">{userName}</span>
          <button type="button" onClick={onLogout} className="btn-ghost !min-h-[40px] !px-4 !py-2 text-[13.5px]">
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-7 flex gap-2" role="tablist" aria-label="Console sections">
        {(
          [
            { id: 'sellers', label: 'Sellers', icon: Store },
            { id: 'buyers', label: 'Buyers', icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 font-sans text-[14px] font-semibold transition-all duration-200 ${
              tab === id
                ? 'border-espresso bg-espresso text-cream'
                : 'border-espresso/20 bg-transparent text-cocoa hover:border-espresso/50'
            }`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {tab === 'sellers' ? <SellersPanel /> : <BuyersPanel />}

      <Link to="/" className="mt-8 inline-flex items-center gap-2 font-sans text-[14px] text-cocoa underline-offset-4 hover:text-espresso hover:underline">
        <ArrowLeft size={15} aria-hidden="true" /> Back to the storefront
      </Link>
    </div>
  )
}

/* ------------------------------ sellers ------------------------------ */

function SellersPanel() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const utils = trpc.useUtils()
  const list = trpc.admin.listOrders.useQuery(
    filter === 'all' ? {} : { status: filter },
    { refetchInterval: 15_000 },
  )
  const detail = trpc.admin.orderDetail.useQuery(
    { publicId: selectedId! },
    { enabled: Boolean(selectedId) },
  )
  const photo = trpc.admin.photoUrl.useQuery(
    { publicId: selectedId! },
    { enabled: Boolean(selectedId) && Boolean(detail.data?.photoKey) },
  )
  const setStatus = trpc.admin.setStatus.useMutation({
    onSuccess: async () => {
      setActionError(null)
      setNote('')
      await Promise.all([
        utils.admin.listOrders.invalidate(),
        utils.admin.orderDetail.invalidate({ publicId: selectedId! }),
      ])
    },
    onError: (e) => {
      if (e.message.includes('2FA')) {
        utils.twofa.state.invalidate()
        setActionError('Your security check expired — verify again to continue.')
      } else {
        setActionError(e.message)
      }
    },
  })

  const orders = list.data ?? []
  const sel = detail.data

  const act = (status: OrderStatus) => {
    if (!selectedId) return
    if (status === 'rejected' && !note.trim()) {
      setActionError('Add a reason — the seller sees this note.')
      return
    }
    setStatus.mutate({ publicId: selectedId, status, note: note.trim() || undefined })
  }

  return (
    <>
      <FilterRow filters={ORDER_FILTERS} value={filter} onChange={setFilter} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-espresso/10 bg-white/60 shadow-lift">
          {list.isPending ? (
            <p className="p-8 font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Loading listings…</p>
          ) : orders.length === 0 ? (
            <p className="p-8 font-sans text-[15px] text-cocoa">No listings in this bucket.</p>
          ) : (
            <ul className="divide-y divide-espresso/10">
              {orders.map((o) => (
                <li key={o.publicId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(o.publicId)
                      setNote('')
                      setActionError(null)
                    }}
                    className={`flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors duration-150 hover:bg-creamdeep/70 ${
                      selectedId === o.publicId ? 'bg-creamdeep' : ''
                    }`}
                  >
                    <span className="font-mono text-[13.5px] tracking-[0.1em] text-cocoa">{o.publicId}</span>
                    <span className="font-sans text-[14.5px] font-semibold text-espresso">
                      {findBrand(o.brandId).name} · {usdFromCents(o.amountUsdCents)}
                    </span>
                    <span className="font-mono text-[13.5px] text-espresso">{ghsFromPesewas(o.payoutPesewas)}</span>
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${ORDER_STYLE[o.status]}`}>
                      {o.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-7">
          {!selectedId ? (
            <p className="py-10 text-center font-sans text-[14.5px] text-cocoa">
              Select a listing to inspect the card, then verify or reject it.
            </p>
          ) : detail.isPending || !sel ? (
            <p className="py-10 text-center font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Loading…</p>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <GiftCardArt brand={findBrand(sel.brandId)} compact className="!w-24 shrink-0 !rounded-lg" />
                <div>
                  <p className="font-mono text-[13.5px] tracking-[0.1em] text-cocoa">{sel.publicId}</p>
                  <p className="mt-0.5 font-sans text-[16.5px] font-semibold text-espresso">
                    {findBrand(sel.brandId).name} · {usdFromCents(sel.amountUsdCents)} → {ghsFromPesewas(sel.payoutPesewas)}
                  </p>
                  <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${ORDER_STYLE[sel.status]}`}>
                    {sel.status}
                  </span>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 font-sans text-[13.5px]">
                <div>
                  <dt className="text-cocoa">Network</dt>
                  <dd className="font-semibold text-espresso">{networkName(sel.network)}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">MoMo number</dt>
                  <dd className="font-mono text-espresso">{sel.phone}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">Wallet name</dt>
                  <dd className="font-semibold text-espresso">{sel.accountName}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">Submitted</dt>
                  <dd className="text-espresso">{new Date(sel.createdAt).toLocaleString('en-GH')}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="font-sans text-[13.5px] text-cocoa">Card code</p>
                <div className="mt-1 flex items-center gap-2 rounded-xl bg-espresso px-4 py-3">
                  <code className="flex-1 select-all break-all font-mono text-[14px] tracking-[0.06em] text-cream">
                    {sel.cardCode}
                  </code>
                  <button
                    type="button"
                    aria-label="Copy card code"
                    onClick={async () => {
                      await navigator.clipboard.writeText(sel.cardCode)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }}
                    className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg bg-cream/10 text-cream transition-colors hover:bg-cream/20"
                  >
                    {copied ? <BadgeCheck size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {sel.photoKey && (
                <div className="mt-5">
                  <p className="font-sans text-[13.5px] text-cocoa">Card photo</p>
                  {photo.data?.url ? (
                    <a href={photo.data.url} target="_blank" rel="noreferrer">
                      <img
                        src={photo.data.url}
                        alt="Seller's card photo"
                        className="mt-2 max-h-56 w-full rounded-xl border border-espresso/10 object-cover"
                      />
                    </a>
                  ) : (
                    <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.12em] text-cocoa">Loading photo…</p>
                  )}
                </div>
              )}

              <EventList events={sel.events} />

              {ORDER_ACTIONS[sel.status].length > 0 && (
                <div className="mt-6 border-t border-espresso/10 pt-5">
                  <label htmlFor="admin-note" className="field-label">Note (required when rejecting)</label>
                  <input
                    id="admin-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="field-line"
                    placeholder="e.g. Balance already redeemed"
                  />
                  {actionError && <p className="field-error" role="alert">{actionError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ORDER_ACTIONS[sel.status].map((a) => (
                      <button
                        key={a.status}
                        type="button"
                        disabled={setStatus.isPending}
                        onClick={() => act(a.status)}
                        className={a.tone === 'go' ? 'btn-primary !min-h-[42px] !px-5 !py-2 text-[14px]' : 'btn-ghost !min-h-[42px] !px-5 !py-2 text-[14px] !text-brand !border-brand/40'}
                      >
                        {a.tone === 'go' ? <BadgeCheck size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sel.status === 'paid' && (
                <p className="mt-6 rounded-xl bg-leaf/10 px-4 py-3 font-sans text-[13.5px] font-medium text-leaf">
                  Closed — the buyer paid this seller directly. The ledger is done.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ------------------------------ buyers ------------------------------ */

function BuyersPanel() {
  const [filter, setFilter] = useState<PurchaseStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const list = trpc.admin.listPurchases.useQuery(
    filter === 'all' ? {} : { status: filter },
    { refetchInterval: 15_000 },
  )
  const detail = trpc.admin.purchaseDetail.useQuery(
    { publicId: selectedId! },
    { enabled: Boolean(selectedId) },
  )
  const proof = trpc.admin.disputeProofUrl.useQuery(
    { publicId: selectedId! },
    { enabled: Boolean(selectedId) && detail.data?.purchase.status === 'disputed' && Boolean(detail.data?.purchase.disputeProofKey), retry: false },
  )

  // If the 12h 2FA pass expires mid-session, bounce back to the challenge gate.
  const guardError = (e: { message: string }) => {
    if (e.message.includes('2FA')) {
      utils.twofa.state.invalidate()
      setActionError('Your security check expired — verify again to continue.')
    } else {
      setActionError(e.message)
    }
  }

  const invalidate = async () => {
    setActionError(null)
    setNote('')
    await Promise.all([
      utils.admin.listPurchases.invalidate(),
      utils.admin.purchaseDetail.invalidate({ publicId: selectedId! }),
    ])
  }
  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: invalidate, onError: guardError })
  const refund = trpc.admin.refund.useMutation({ onSuccess: invalidate, onError: guardError })
  const cancelPurchase = trpc.admin.cancelPurchase.useMutation({ onSuccess: invalidate, onError: guardError })
  const resolveRelease = trpc.admin.resolveRelease.useMutation({ onSuccess: invalidate, onError: guardError })

  const busy = confirmPayment.isPending || refund.isPending || cancelPurchase.isPending || resolveRelease.isPending
  const rows = list.data ?? []
  const sel = detail.data

  return (
    <>
      <FilterRow filters={PURCHASE_FILTERS} value={filter} onChange={setFilter} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-espresso/10 bg-white/60 shadow-lift">
          {list.isPending ? (
            <p className="p-8 font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Loading purchases…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 font-sans text-[15px] text-cocoa">No purchases in this bucket.</p>
          ) : (
            <ul className="divide-y divide-espresso/10">
              {rows.map((r) => (
                <li key={r.publicId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(r.publicId)
                      setNote('')
                      setActionError(null)
                    }}
                    className={`flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors duration-150 hover:bg-creamdeep/70 ${
                      selectedId === r.publicId ? 'bg-creamdeep' : ''
                    }`}
                  >
                    <span className="font-mono text-[13.5px] tracking-[0.1em] text-cocoa">{r.publicId}</span>
                    <span className="font-sans text-[14.5px] font-semibold text-espresso">
                      {findBrand(r.brandId).name} · {usdFromCents(r.amountUsdCents)}
                    </span>
                    <span className="font-mono text-[13.5px] text-espresso">{ghsFromPesewas(r.pricePesewas)}</span>
                    <span className="font-sans text-[13px] text-cocoa">{r.buyerName}</span>
                    <span className={`ml-auto rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${PURCHASE_STYLE[r.status]}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-7">
          {!selectedId ? (
            <p className="py-10 text-center font-sans text-[14.5px] text-cocoa">
              Select a purchase to confirm escrow, release codes, or resolve disputes.
            </p>
          ) : detail.isPending || !sel ? (
            <p className="py-10 text-center font-mono text-[13px] uppercase tracking-[0.14em] text-cocoa">Loading…</p>
          ) : (
            <div>
              <p className="font-mono text-[13.5px] tracking-[0.1em] text-cocoa">{sel.purchase.publicId}</p>
              <p className="mt-1 font-sans text-[16.5px] font-semibold text-espresso">
                {findBrand(sel.order.brandId).name} · {usdFromCents(sel.order.amountUsdCents)} →{' '}
                {ghsFromPesewas(sel.purchase.pricePesewas)}
              </p>
              <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] ${PURCHASE_STYLE[sel.purchase.status]}`}>
                {sel.purchase.status.replace('_', ' ')}
              </span>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 font-sans text-[13.5px]">
                <div>
                  <dt className="text-cocoa">Buyer</dt>
                  <dd className="font-semibold text-espresso">{sel.purchase.buyerName}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">Buyer MoMo</dt>
                  <dd className="font-mono text-espresso">
                    {networkName(sel.purchase.buyerNetwork)} · {sel.purchase.buyerPhone}
                  </dd>
                </div>
                <div>
                  <dt className="text-cocoa">Seller gets (direct)</dt>
                  <dd className="font-mono text-espresso">{ghsFromPesewas(sel.order.payoutPesewas)}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">CardCedi fee (10%)</dt>
                  <dd className="font-mono text-espresso">
                    {ghsFromPesewas(sel.purchase.pricePesewas - sel.order.payoutPesewas)}
                  </dd>
                </div>
                <div>
                  <dt className="text-cocoa">Seller MoMo</dt>
                  <dd className="font-mono text-espresso">
                    {networkName(sel.order.network)} · {sel.order.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-cocoa">Seller payout</dt>
                  <dd className="font-mono text-espresso">{payoutLabel(sel.purchase)}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">Listing</dt>
                  <dd className="font-mono text-espresso">{sel.order.publicId}</dd>
                </div>
                <div>
                  <dt className="text-cocoa">Checked out</dt>
                  <dd className="text-espresso">{new Date(sel.purchase.createdAt).toLocaleString('en-GH')}</dd>
                </div>
              </dl>

              {sel.purchase.buyerNote && (
                <p className="mt-4 rounded-xl bg-butter/30 px-4 py-3 font-sans text-[13.5px] leading-snug text-espresso">
                  <Flag size={13} className="mr-1.5 inline -translate-y-0.5" aria-hidden="true" />
                  {sel.purchase.buyerNote}
                </p>
              )}

              {sel.purchase.status === 'disputed' && (
                <div className="mt-4 rounded-xl border border-brand/25 bg-brand/5 p-4">
                  <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.08em] text-brand">
                    Buyer's proof
                  </p>
                  {proof.isPending ? (
                    <p className="mt-2 font-sans text-[13.5px] text-cocoa">Loading proof image…</p>
                  ) : proof.data ? (
                    <a href={proof.data.url} target="_blank" rel="noreferrer" className="mt-2 block">
                      <img
                        src={proof.data.url}
                        alt="Buyer's dispute proof"
                        className="max-h-56 rounded-lg border border-espresso/10 object-contain"
                      />
                    </a>
                  ) : (
                    <p className="mt-2 font-sans text-[13.5px] text-cocoa">No proof image attached.</p>
                  )}
                </div>
              )}

              <EventList events={sel.events} />

              {/* actions */}
              {!['completed', 'refunded', 'cancelled'].includes(sel.purchase.status) && (
                <div className="mt-6 border-t border-espresso/10 pt-5">
                  <label htmlFor="buyer-note" className="field-label">Note (required for refunds)</label>
                  <input
                    id="buyer-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="field-line"
                    placeholder="e.g. MoMo ref MTN-88231, or dispute outcome"
                  />
                  {actionError && <p className="field-error" role="alert">{actionError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['awaiting_payment', 'payment_sent'].includes(sel.purchase.status) && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => confirmPayment.mutate({ publicId: selectedId, note: note.trim() || undefined })}
                          className="btn-primary !min-h-[42px] !px-5 !py-2 text-[14px]"
                        >
                          <Banknote size={15} aria-hidden="true" /> Payments received — release code
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => cancelPurchase.mutate({ publicId: selectedId, note: note.trim() || undefined })}
                          className="btn-ghost !min-h-[42px] !px-5 !py-2 text-[14px]"
                        >
                          Cancel & relist
                        </button>
                      </>
                    )}
                    {['payment_sent', 'confirmed'].includes(sel.purchase.status) && (
                      <button
                        type="button"
                        disabled={busy || !note.trim()}
                        onClick={() => refund.mutate({ publicId: selectedId, note: note.trim(), rejectCard: false })}
                        className="btn-ghost !min-h-[42px] !px-5 !py-2 text-[14px] !text-brand !border-brand/40"
                      >
                        <HandCoins size={15} aria-hidden="true" /> Refund buyer
                      </button>
                    )}
                    {sel.purchase.status === 'disputed' && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resolveRelease.mutate({ publicId: selectedId, note: note.trim() || undefined })}
                          className="btn-primary !min-h-[42px] !px-5 !py-2 text-[14px]"
                        >
                          <BadgeCheck size={15} aria-hidden="true" /> Uphold seller — release
                        </button>
                        <button
                          type="button"
                          disabled={busy || !note.trim()}
                          onClick={() => refund.mutate({ publicId: selectedId, note: note.trim(), rejectCard: true })}
                          className="btn-ghost !min-h-[42px] !px-5 !py-2 text-[14px] !text-brand !border-brand/40"
                        >
                          <HandCoins size={15} aria-hidden="true" /> Uphold buyer — refund & kill card
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {sel.purchase.status === 'completed' && (
                <p className="mt-6 rounded-xl bg-leaf/10 px-4 py-3 font-sans text-[13.5px] font-medium text-leaf">
                  Completed — the dispute window passed. Trade closed.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** Human label for where the seller payout stands. */
function payoutLabel(p: {
  payoutStatus: string
  payoutDueAt: Date | null
}): string {
  switch (p.payoutStatus) {
    case 'scheduled':
      return p.payoutDueAt ? `fires ${new Date(p.payoutDueAt).toLocaleTimeString('en-GH')}` : 'scheduled'
    case 'sent':
      return 'sent'
    case 'failed':
      return 'failing — retrying'
    case 'frozen':
      return 'frozen (dispute)'
    default:
      return 'direct (manual)'
  }
}

/* ------------------------------ shared ------------------------------ */

function FilterRow<T extends string>({
  filters,
  value,
  onChange,
}: {
  filters: { id: T | 'all'; label: string }[]
  value: T | 'all'
  onChange: (v: T | 'all') => void
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={value === f.id}
          onClick={() => onChange(f.id)}
          className={`cursor-pointer rounded-full border px-4 py-2 font-sans text-[13.5px] font-medium transition-all duration-200 ${
            value === f.id
              ? 'border-espresso bg-espresso text-cream'
              : 'border-espresso/20 bg-transparent text-cocoa hover:border-espresso/50'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function EventList({ events }: { events: { id: number; status: string; note: string | null; createdAt: Date }[] }) {
  return (
    <ol className="mt-5 space-y-1.5 border-t border-espresso/10 pt-4">
      {events.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 font-sans text-[13px] text-cocoa">
          <Clock size={12} className="translate-y-0.5 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-espresso">{e.status.replace('_', ' ')}</span>
          <span>{new Date(e.createdAt).toLocaleString('en-GH')}</span>
          {e.note && <span className="italic">— {e.note}</span>}
        </li>
      ))}
    </ol>
  )
}
