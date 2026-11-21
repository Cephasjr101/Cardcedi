import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { AMOUNT_PRESETS, CARD_BRANDS, findBrand, payoutFor, pctOfFace } from '../lib/data'
import Odometer from './Odometer'

export default function Calculator() {
  const [brandId, setBrandId] = useState('amazon')
  const [amountRaw, setAmountRaw] = useState('100')
  const brand = findBrand(brandId)
  const usd = Math.max(0, Number(amountRaw) || 0)
  const payout = useMemo(() => payoutFor(brand, usd), [brand, usd])
  const inRange = usd >= brand.minUsd && usd <= brand.maxUsd

  return (
    <div className="rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift backdrop-blur-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-semibold tracking-tight text-espresso md:text-[26px]">
          What’s your card worth?
        </h2>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-creamdeep px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-cocoa sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          Demo rates
        </span>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="calc-brand" className="field-label">
            Gift card
          </label>
          <select
            id="calc-brand"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="field-line cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%237B6556%22 stroke-width=%222.5%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_0.25rem_center] bg-no-repeat pr-8"
          >
            {CARD_BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-amount" className="field-label">
            Card value (USD)
          </label>
          <input
            id="calc-amount"
            inputMode="decimal"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.]/g, ''))}
            className="field-line font-mono"
            placeholder="100"
            aria-describedby="calc-range"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
        {AMOUNT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmountRaw(String(preset))}
            className={`min-h-[36px] cursor-pointer rounded-full border px-4 font-mono text-[13px] transition-all duration-200 ${
              Number(amountRaw) === preset
                ? 'border-espresso bg-espresso text-cream'
                : 'border-espresso/20 bg-transparent text-espresso hover:border-espresso'
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-creamdeep p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-cocoa">
            You receive
          </p>
          <p className="mt-1 text-espresso">
            <Odometer value={payout} prefix="GH₵" className="text-[34px] leading-none md:text-[42px]" />
          </p>
          <p id="calc-range" className="mt-2 font-sans text-[13px] text-cocoa">
            GH₵{brand.rate.toFixed(2)} per $1 · {pctOfFace(brand)}% of face value ·
            payout {brand.speed}
          </p>
        </div>
        <div className="shrink-0">
          {inRange && usd > 0 ? (
            <Link
              to={`/sell?brand=${brand.id}&amount=${usd}`}
              className="btn-primary w-full md:w-auto"
            >
              Sell this card <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ) : (
            <p className="max-w-[220px] rounded-xl border border-espresso/15 bg-cream px-4 py-3 font-sans text-[13px] leading-snug text-cocoa">
              {brand.name} cards: ${brand.minUsd}–${brand.maxUsd} per trade
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 font-sans text-[13px] leading-snug text-cocoa">
        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-leaf" aria-hidden="true" />
        Rate locks when you submit — the figure above is exactly what lands in your wallet.
      </p>
    </div>
  )
}
