import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ArrowRight, Menu, X } from 'lucide-react'

const NAV = [
  { to: '/market', label: 'Buy cards' },
  { to: '/#rates', label: 'Rates' },
  { to: '/#how', label: 'How it works' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/track', label: 'Track' },
]

function scrollToHash(hash: string) {
  const el = document.querySelector(hash)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location])

  const handleAnchor = (e: React.MouseEvent, to: string) => {
    if (!to.includes('#')) return
    const hash = to.slice(to.indexOf('#'))
    if (location.pathname === '/') {
      e.preventDefault()
      scrollToHash(hash)
      setOpen(false)
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled || open
          ? 'border-b border-espresso/10 bg-cream/85 shadow-lift backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-5 md:h-[72px] md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-full focus-visible:outline-brand"
          aria-label="CardCedi home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-cream">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
              <path d="M2.5 10h19" />
            </svg>
          </span>
          <span className="font-display text-[22px] font-semibold tracking-tight text-espresso">
            CardCedi
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((item) =>
            item.to.includes('#') ? (
              <a
                key={item.to}
                href={item.to.replace('/', '/#') === item.to ? item.to : item.to}
                onClick={(e) => handleAnchor(e, item.to)}
                className="font-sans text-[15px] font-medium text-espresso/75 transition-colors duration-200 hover:text-brand"
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `font-sans text-[15px] font-medium transition-colors duration-200 hover:text-brand ${
                    isActive ? 'text-brand' : 'text-espresso'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="hidden md:block">
          <Link to="/sell" className="btn-primary !min-h-[42px] px-5 py-2 text-[14px]">
            Sell a card <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <button
          type="button"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-espresso transition-colors hover:bg-espresso/5 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* mobile menu */}
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-out md:hidden ${
          open ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-5 pb-5 pt-1" aria-label="Mobile">
          {NAV.map((item) =>
            item.to.includes('#') ? (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => handleAnchor(e, item.to)}
                className="rounded-xl px-3 py-3 font-sans text-[16px] font-medium text-espresso transition-colors hover:bg-espresso/5"
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-3 font-sans text-[16px] font-medium text-espresso transition-colors hover:bg-espresso/5"
              >
                {item.label}
              </NavLink>
            ),
          )}
          <Link to="/sell" className="btn-primary mt-2 w-full">
            Sell a card <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  )
}
