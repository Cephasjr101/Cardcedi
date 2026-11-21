import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import GiftCardArt from '../components/GiftCardArt'
import { CARD_BRANDS, pctOfFace } from '../lib/data'

export default function RatesTable() {
  return (
    <section id="rates" className="scroll-mt-20 bg-cream">
      <div className="mx-auto max-w-shell px-5 py-20 md:px-8 md:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">
              Live buy rates
            </p>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-espresso md:text-[54px]">
              Every card, one honest number.
            </h2>
          </div>
          <p className="max-w-[38ch] font-sans text-[15px] leading-relaxed text-cocoa">
            Ghana cedis paid per $1 of face value. No fees on top — the rate is
            the whole story.
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_BRANDS.map((brand, i) => (
            <Reveal as="li" key={brand.id} delay={Math.min(i, 5) * 60}>
              <Link
                to={`/sell?brand=${brand.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-espresso/10 bg-white/55 p-4 shadow-lift transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:shadow-lifthover"
              >
                <GiftCardArt brand={brand} compact className="!w-24 shrink-0 !rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-sans text-[16px] font-semibold text-espresso">
                      {brand.name}
                    </p>
                    {brand.tag && (
                      <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-brand">
                        {brand.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[15px] text-espresso">
                    $1 → GH₵{brand.rate.toFixed(2)}
                  </p>
                  <p className="mt-0.5 font-sans text-[12.5px] text-cocoa">
                    {pctOfFace(brand)}% of face · ${brand.minUsd}–${brand.maxUsd} · {brand.speed}
                  </p>
                </div>
                <ArrowUpRight
                  size={18}
                  className="shrink-0 text-cocoa transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
