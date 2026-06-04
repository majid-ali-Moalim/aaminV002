'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

type PendingNav = { key: string; href: string }

type OptimisticNavContextValue = {
  setPending: (key: string, href: string) => void
  isActive: (key: string, href: string, exact?: boolean) => boolean
  isNavigating: boolean
  pendingHref: string | null
}

const OptimisticNavContext = createContext<OptimisticNavContextValue | null>(null)

function normalizeHref(href: string) {
  return href.split('?')[0]
}

function pathMatches(pathname: string, href: string, exact?: boolean) {
  const target = normalizeHref(href)
  if (exact) return pathname === target
  return pathname === target || pathname.startsWith(`${target}/`)
}

export function OptimisticNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [pending, setPendingState] = useState<PendingNav | null>(null)

  useEffect(() => {
    if (!pending) return
    if (pathMatches(pathname, pending.href)) {
      setPendingState(null)
    }
  }, [pathname, pending])

  const setPending = useCallback((key: string, href: string) => {
    setPendingState({ key, href })
  }, [])

  const isActive = useCallback(
    (key: string, href: string, exact?: boolean) => {
      if (pending) return pending.key === key
      return pathMatches(pathname, href, exact)
    },
    [pathname, pending],
  )

  const value = useMemo(
    () => ({
      setPending,
      isActive,
      isNavigating: pending !== null,
      pendingHref: pending?.href ?? null,
    }),
    [setPending, isActive, pending],
  )

  return (
    <OptimisticNavContext.Provider value={value}>{children}</OptimisticNavContext.Provider>
  )
}

export function useOptimisticNav() {
  const ctx = useContext(OptimisticNavContext)
  const pathname = usePathname()

  if (ctx) return ctx

  return {
    setPending: () => {},
    isActive: (key: string, href: string, exact?: boolean) =>
      pathMatches(pathname, href, exact),
    isNavigating: false,
    pendingHref: null,
  }
}

export function NavigationProgressBar() {
  const { isNavigating } = useOptimisticNav()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isNavigating) return null
  return (
    <div className="fixed top-0 left-64 right-0 z-50 h-0.5 overflow-hidden bg-red-500/20 pointer-events-none">
      <div className="h-full w-full bg-red-500 animate-pulse origin-left scale-x-100" />
    </div>
  )
}
