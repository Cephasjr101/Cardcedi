import { useMemo } from 'react'

/**
 * Odometer — each digit is a sliding column (translate transforms only).
 * Amounts tick up/down like a departure board when the value changes.
 */
export default function Odometer({
  value,
  className = '',
  prefix = '',
  decimals = 2,
}: {
  value: number
  className?: string
  prefix?: string
  decimals?: number
}) {
  const text = useMemo(() => {
    const fixed = value.toFixed(decimals)
    const [int, frac] = fixed.split('.')
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decimals > 0 ? `${grouped}.${frac}` : grouped
  }, [value, decimals])

  return (
    <span className={`inline-flex items-baseline overflow-hidden font-mono ${className}`} aria-label={`${prefix}${text}`}>
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {text.split('').map((ch, i) => {
        if (ch < '0' || ch > '9') {
          return (
            <span key={`${i}-${ch}`} aria-hidden="true" className="inline-block">
              {ch}
            </span>
          )
        }
        const digit = Number(ch)
        return (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline leading-none">
            <span
              className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-out"
              style={{ transform: `translateY(calc(-${digit} * 1em))` }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
            {/* preserve line height */}
            <span className="invisible block h-[1em] leading-none">0</span>
          </span>
        )
      })}
    </span>
  )
}
