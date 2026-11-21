import { Link } from 'react-router'
import { ArrowRight, BadgeCheck, RefreshCcw, ShieldCheck, Store } from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import { findBrand, ghsFromPesewas, usdFromCents } from '../lib/data'
import { trpc } from '@/providers/trpc'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Market() {
  usePageTitle('Buy cards')
  const listings = trpc.market.listings.useQuery(undefined, {
    refetchInterval: 15_000,
  })

  const items = listings.data ?? []

  return (
    <div className="mx-auto max-w-shell px-5 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">The market</p>
          <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[46px]">
            Verified cards,{' '}
            <span className="font-script text-[1.25em] font-normal text-brand">ready to spend.</span>
          </h1>
          <p className="mt-4 font-sans text-[15.5px] leading-relaxed text-cocoa">
            Every card here was checked by a human before it listed. Your MoMo
            goes straight to the seller — we hold the code until payment
            confirms, and a bad card means your money back, not an argument.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-cocoa">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-leaf" aria-hidden="true" />
          {listings.isPending ? 'Loading stock…' : `${items.length} card${items.length === 1 ? '' : 's'} live`}
        </div>
      </div>

      {/* trust strip */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, text: 'Code held until your payment confirms — no payment, no code' },
          { icon: BadgeCheck, text: 'Human-verified balance and region on every listing' },
          { icon: RefreshCcw, text: 'Bad card? Dispute it and get every pesewa back' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-3 rounded-2xl bg-creamdeep px-4 py-3.5">
            <Icon size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <p className="font-sans text-[13.5px] leading-snug text-espresso/85">{text}</p>
          </div>
        ))}
      </div>

      {/* grid */}
      {!listings.isPending && items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-espresso/25 bg-creamdeep/60 p-12 text-center">
          <Store size={34} className="mx-auto text-cocoa" aria-hidden="true" />
          <p className="mt-4 font-display text-[24px] font-semibold text-espresso">Sold out — for now.</p>
          <p className="mx-auto mt-2 max-w-md font-sans text-[14.5px] leading-relaxed text-cocoa">
            New cards land as sellers list them. Check back shortly, or sell a
            card of your own and take the seller rate instead.
          </p>
          <Link to="/sell" className="btn-primary mt-6 inline-flex">
            Sell a card <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((l) => {
            const brand = findBrand(l.brandId)
            return (
              <li key={l.publicId}>
                <Link
                  to={`/buy?id=${l.publicId}`}
                  className="group block rounded-3xl border border-espresso/10 bg-white/60 p-4 shadow-lift transition-all duration-200 hover:-translate-y-1 hover:shadow-lifthover"
                >
                  <GiftCardArt brand={brand} usd={l.amountUsdCents / 100} className="!rounded-xl" />
                  <div className="mt-4 flex items-baseline justify-between gap-2 px-1">
                    <p className="font-sans text-[16px] font-semibold text-espresso">
                      {brand.name} · {usdFromCents(l.amountUsdCents)}
                    </p>
                    <p className="font-mono text-[15px] text-espresso">{ghsFromPesewas(l.pricePesewas)}</p>
                  </div>
                  <p className="mt-1 px-1 font-sans text-[12.5px] text-cocoa">
                    {l.publicId} · verified listing
                  </p>
                  <span className="mt-3 flex items-center justify-center gap-2 rounded-full bg-espresso py-2.5 font-sans text-[13.5px] font-semibold text-cream transition-colors duration-200 group-hover:bg-brand">
                    Buy this card <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
