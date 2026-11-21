import { useEffect } from 'react'

const BASE = 'CardCedi'

/** Set the browser tab title for the current page (SEO + UX). */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Ghana's gift card marketplace`
  }, [title])
}
