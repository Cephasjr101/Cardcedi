import type { CardBrand } from '../lib/data'

/**
 * Code-drawn gift card — no images, no broken links.
 * Renders a rounded plastic card with brand paper/ink, a magnetic stripe,
 * a chip, and a punched value panel.
 */
export default function GiftCardArt({
  brand,
  usd,
  tilt = 0,
  compact = false,
  className = '',
  style,
}: {
  brand: CardBrand
  usd?: number
  tilt?: number
  /** small tile: brand name only, no fine print */
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`relative aspect-[8/5] w-full select-none overflow-hidden rounded-2xl shadow-card3d ${className}`}
      style={{
        background: brand.paper,
        color: brand.ink,
        transform: `rotate(${tilt}deg)`,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* sheen */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.12) 100%)',
        }}
      />
      {compact ? (
        <div className="absolute inset-0 flex items-center justify-center px-1.5">
          <span className="text-center font-sans text-[9px] font-bold uppercase leading-tight tracking-[0.1em]">
            {brand.name}
          </span>
        </div>
      ) : (
        <>
          {/* top row */}
          <div className="absolute left-[7%] top-[9%] right-[7%] flex items-start justify-between">
            <span className="font-sans text-[clamp(11px,1.6vw,15px)] font-bold uppercase tracking-[0.14em]">
              {brand.name}
            </span>
            <span className="font-mono text-[clamp(9px,1.2vw,12px)] uppercase opacity-70">gift card</span>
          </div>
          {/* chip */}
          <div
            className="absolute left-[7%] top-[34%] h-[16%] w-[13%] rounded-[4px]"
            style={{
              background:
                'linear-gradient(135deg, #E8D9A8 0%, #C9B071 45%, #F1E4BC 60%, #B89A5A 100%)',
            }}
          >
            <div className="absolute inset-y-0 left-1/2 w-px bg-black/20" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
          </div>
          {/* value */}
          {typeof usd === 'number' && (
            <div className="absolute right-[7%] top-[32%] rounded-md bg-black/25 px-2.5 py-1 font-mono text-[clamp(11px,1.6vw,16px)]">
              ${usd}
            </div>
          )}
          {/* bottom row */}
          <div className="absolute bottom-[9%] left-[7%] right-[7%] flex items-end justify-between">
            <span className="font-mono text-[clamp(9px,1.3vw,13px)] tracking-[0.18em] opacity-80">
              {brand.short} •••• ••••
            </span>
            <span
              className="h-[18px] w-[30px] rounded-full opacity-80"
              style={{
                background:
                  'radial-gradient(circle at 35% 50%, rgba(255,255,255,0.9) 0 28%, transparent 30%), radial-gradient(circle at 65% 50%, rgba(255,255,255,0.55) 0 28%, transparent 30%)',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
