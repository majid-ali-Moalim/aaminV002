'use client'

import { useState } from 'react'
import { Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getBrowserNotificationPermission,
  hasAskedDesktopPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from '@/lib/notifications/browserNotifications'
import {
  loadDesktopNotificationPrefs,
  saveDesktopNotificationPrefs,
} from '@/lib/notifications/desktopPreferences'

export default function DesktopNotificationPrompt() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !isBrowserNotificationSupported()) return null
  if (hasAskedDesktopPermission() && getBrowserNotificationPermission() !== 'default') return null

  const prefs = loadDesktopNotificationPrefs()
  if (prefs.desktopEnabled && getBrowserNotificationPermission() === 'granted') return null

  const enable = async () => {
    const permission = await requestBrowserNotificationPermission()
    if (permission === 'granted') {
      saveDesktopNotificationPrefs({ ...loadDesktopNotificationPrefs(), desktopEnabled: true })
      toast.success('Desktop notifications enabled')
      setDismissed(true)
      return
    }
    if (permission === 'denied') {
      toast.error('Notifications blocked in browser settings. In-app alerts still work.')
    }
    setDismissed(true)
  }

  return (
    <div className="mx-3 mt-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex gap-3 items-start">
      <Monitor className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 dark:text-white">Enable desktop notifications</p>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
          Get critical mission alerts even when this tab is in the background.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => void enable()}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Enable
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
