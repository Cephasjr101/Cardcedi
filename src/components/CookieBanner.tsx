import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'cardcedi-consent'

/**
 * Cookie consent — informational: the site only uses essential storage
 * (sign-in session, preferences). Choice persists in localStorage.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // storage blocked — show nothing rather than nagging on every page
    }
  }, [])

  const choose = (value: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-3xl border border-espresso/10 bg-cream p-5 shadow-lifthover md:bottom-6"
    >
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-butter/50 text-espresso">
          <Cookie size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[15px] font-semibold text-espresso">A quick word on cookies</p>
          <p className="mt-1 font-sans text-[13.5px] leading-snug text-cocoa">
            We use only essential cookies and storage — to keep you signed in and remember your
            preferences. No ad trackers, ever. Details are in our{' '}
            <Link to="/terms" className="font-medium text-espresso underline underline-offset-2">
              terms
            </Link>
            .
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="btn-primary !min-h-[40px] !px-5 !py-2 text-[13.5px]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => choose('declined')}
              className="btn-ghost !min-h-[40px] !px-5 !py-2 text-[13.5px]"
            >
              Essential only
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss cookie notice"
          onClick={() => choose('declined')}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-cocoa transition-colors hover:bg-espresso/5 hover:text-espresso"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
