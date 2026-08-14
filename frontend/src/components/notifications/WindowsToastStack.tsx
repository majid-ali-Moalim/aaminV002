'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, MoreHorizontal } from 'lucide-react'
import { useWindowsToastStore } from '@/lib/stores/windowsToastStore'
import { requestBrowserNotificationPermission } from '@/lib/notifications/browserNotifications'

const AUTO_DISMISS_MS = 12000

/** Windows 11–style toast stack (bottom-right), like Snipping Tool / system alerts. */
export default function WindowsToastStack() {
  const router = useRouter()
  const { toasts, dismissToast } = useWindowsToastStore()

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.id), AUTO_DISMISS_MS),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [toasts, dismissToast])

  if (!toasts.length) return null

  const handleAction = async (toast: (typeof toasts)[0]) => {
    dismissToast(toast.id)
    if (toast.href === '__enable_notifications__') {
      await requestBrowserNotificationPermission()
      return
    }
    if (toast.href) router.push(toast.href)
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-[min(calc(100vw-2rem),22rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-in slide-in-from-right-8 fade-in duration-300 rounded-xl border border-black/5 bg-[#fafafa]/95 dark:bg-[#2b2b2b]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden"
          role="alert"
        >
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aamin-icon.svg" alt="" className="w-5 h-5 rounded-md shrink-0" />
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">
              {toast.appName}
            </span>
            <button
              type="button"
              className="p-1 rounded-md text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"
              aria-hidden
              tabIndex={-1}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-md text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pb-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{toast.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{toast.message}</p>
          </div>

          <button
            type="button"
            onClick={() => void handleAction(toast)}
            className="w-full py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/10 border-t border-black/5 dark:border-white/10 transition-colors"
          >
            {toast.actionLabel}
          </button>
        </div>
      ))}
    </div>
  )
}
