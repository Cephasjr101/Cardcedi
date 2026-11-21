import { Link } from 'react-router'
import { ArrowRight, ShieldCheck, Timer, Wallet } from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import Calculator from '../components/Calculator'
import Reveal from '../components/Reveal'
import { findBrand } from '../lib/data'

export default function Hero() {
  const amazon = findBrand('amazon')
  const apple = findBrand('apple')
  const steam = findBrand('steam')

  return (
    <section className="relative overflow-x-clip">
      <div className="mx-auto max-w-shell px-5 pb-0 pt-12 md:px-8 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* copy */}
          <Reveal>
            <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">
              Ghana’s gift card marketplace
            </p>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] text-espresso md:text-[72px] md:leading-[0.98]">
              Turn gift cards into{' '}
              <span className="font-script text-[1.35em] font-normal leading-none text-brand">
                cedis
              </span>
              .
            </h1>
            <p className="mt-6 max-w-[52ch] font-sans text-[17px] leading-relaxed text-espresso/75 md:text-[19px]">
              Sellers list Amazon, Apple, Steam and more; buyers pay them
              directly in cedis. We hold the card code until the money lands
              and keep a flat 10% — everything else is the seller’s.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/sell" className="btn-primary">
                Sell a card now <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link to="/market" className="btn-ghost">
                Buy cards
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
              {[
                { icon: Timer, label: 'Instant MoMo payout' },
                { icon: ShieldCheck, label: 'Flat 10% fee, nothing hidden' },
                { icon: Wallet, label: 'MTN · Telecel · AirtelTigo' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 font-sans text-[14px] font-medium text-cocoa">
                  <Icon size={17} className="text-brand" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* floating card stack */}
          <Reveal delay={120} className="relative hidden h-[420px] lg:block">
            <div className="float-slower absolute left-0 top-16 w-[62%]" style={{ '--card-rot': '-8deg', '--card-tilt': '-11deg' } as React.CSSProperties}>
              <GiftCardArt brand={apple} usd={50} />
            </div>
            <div className="float-slow absolute right-0 top-0 w-[70%]" style={{ '--card-rot': '6deg', '--card-tilt': '9deg' } as React.CSSProperties}>
              <GiftCardArt brand={amazon} usd={100} />
            </div>
            <div className="float-slower absolute bottom-0 left-[16%] w-[64%]" style={{ '--card-rot': '-3deg', '--card-tilt': '-6deg' } as React.CSSProperties}>
              <GiftCardArt brand={steam} usd={25} />
            </div>
            {/* payout chip */}
            <div className="absolute bottom-16 right-2 rounded-2xl border border-espresso/10 bg-cream px-4 py-3 shadow-lifthover">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-cocoa">paid out</p>
              <p className="font-mono text-[20px] text-espresso">GH₵980.00</p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* calculator overlapping the fold */}
      <div className="mx-auto max-w-shell px-5 md:px-8">
        <Reveal delay={80} className="relative z-10 mt-12 md:-mb-24 md:mt-16">
          <Calculator />
        </Reveal>
      </div>
    </section>
  )
}
