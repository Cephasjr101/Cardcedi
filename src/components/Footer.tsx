import { Link } from 'react-router'

export default function Footer() {
  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto max-w-shell px-5 pb-10 pt-16 md:px-8 md:pt-24">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-sans text-[15px] leading-relaxed text-cream/70">
              The gift card marketplace where buyers pay sellers directly — a
              flat 10% keeps the platform running, the rest is yours.
            </p>
            <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.14em] text-cream/45">
              Accra · Kumasi · everywhere MoMo reaches
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="mb-4 font-mono text-[12px] uppercase tracking-[0.14em] text-cream/45">
              Trade
            </p>
            <ul className="space-y-2.5 font-sans text-[15px]">
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/sell">Sell a card</Link></li>
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/market">Buy cards</Link></li>
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/track">Track an order</Link></li>
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/#rates">Live rates</Link></li>
            </ul>
          </nav>
          <div>
            <p className="mb-4 font-mono text-[12px] uppercase tracking-[0.14em] text-cream/45">
              Help
            </p>
            <ul className="space-y-2.5 font-sans text-[15px]">
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/#how">How it works</Link></li>
              <li><Link className="text-cream/80 transition-colors hover:text-cream" to="/#faq">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-cream/15 pt-6 font-sans text-[13px] leading-relaxed text-cream/50">
          Rates are indicative. Every trade is verified by a person, and sellers
          are paid directly to their MoMo wallet — we never ask for your MoMo PIN
          or OTP. Trading on CardCedi means accepting our{' '}
          <Link to="/terms" className="underline underline-offset-2 hover:text-cream/80">terms &amp; conditions</Link>.
        </p>
      </div>

      {/* Massive wordmark */}
      <div className="overflow-hidden px-2 pb-2" aria-hidden="true">
        <p className="select-none text-center font-display text-[16.5vw] font-semibold leading-[0.85] tracking-tight text-cream/[0.13]">
          CardCedi
        </p>
      </div>
    </footer>
  )
}
