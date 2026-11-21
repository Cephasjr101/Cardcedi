import { TICKER_ITEMS } from '../lib/data'

/**
 * Rates ticker — full-width espresso strip, duplicated content, transform-only
 * infinite scroll. Pauses on hover/focus; disabled under reduced motion.
 */
export default function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div
      className="overflow-hidden bg-espresso py-2.5 text-cream"
      role="marquee"
      aria-label="Live gift card rates"
    >
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            aria-hidden={i >= TICKER_ITEMS.length}
            className="flex items-center gap-3 whitespace-nowrap font-mono text-[12.5px] tracking-[0.04em]"
          >
            <span className="text-cream/90">{item}</span>
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-brand" fill="currentColor" aria-hidden="true">
              <path d="M4 0l1.2 2.8L8 4 5.2 5.2 4 8 2.8 5.2 0 4l2.8-1.2z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  )
}
