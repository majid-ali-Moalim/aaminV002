'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NAVIGATION_START_EVENT } from '@/lib/navigation/navigationEvents'

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

export default function RouteLoadingFeedback() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const lastPathRef = useRef(pathname)

  const showLoader = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setLoading(true)
    timeoutRef.current = window.setTimeout(() => setLoading(false), 12_000)
  }

  const hideLoader = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLoading(false))
    })
  }

  useEffect(() => {
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname
    hideLoader()
  }, [pathname])

  useEffect(() => {
    const onNavigationStart = () => showLoader()

    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null
      if (!anchor || !anchor.href || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const nextUrl = new URL(anchor.href)
      if (nextUrl.origin !== window.location.origin) return
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return

      showLoader()
    }

    const patchHistory = (method: 'pushState' | 'replaceState') => {
      const original = history[method].bind(history)
      history[method] = (...args: Parameters<History['pushState']>) => {
        showLoader()
        return original(...args)
      }
      return original
    }

    const originalPush = patchHistory('pushState')
    const originalReplace = patchHistory('replaceState')

    window.addEventListener(NAVIGATION_START_EVENT, onNavigationStart)
    window.addEventListener('beforeunload', showLoader)
    window.addEventListener('popstate', showLoader)
    document.addEventListener('click', onClick, true)

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      history.pushState = originalPush
      history.replaceState = originalReplace
      window.removeEventListener(NAVIGATION_START_EVENT, onNavigationStart)
      window.removeEventListener('beforeunload', showLoader)
      window.removeEventListener('popstate', showLoader)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  if (!loading) return null

  return (
    <div className="route-loading-feedback" aria-live="polite" aria-label="Loading page">
      <div className="route-loading-bar" />
      <div className="route-loading-pill">
        <span className="route-loading-spinner" />
        Opening module...
      </div>
    </div>
  )
}
