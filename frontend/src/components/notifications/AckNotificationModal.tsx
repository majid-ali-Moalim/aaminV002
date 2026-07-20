'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { notificationsService } from '@/lib/api'

/** Blocking acknowledgment popup — dismissible only via OK (for mission reassignment alerts). */
export default function AckNotificationModal() {
  const notification = useNotificationStore((s) => s.ackModalNotification)
  const dismissAckModal = useNotificationStore((s) => s.dismissAckModal)
  const markLocalRead = useNotificationStore((s) => s.markLocalRead)
  const [isClosing, setIsClosing] = useState(false)

  if (!notification) return null

  const handleOk = async () => {
    if (isClosing) return
    setIsClosing(true)
    try {
      await notificationsService.markRead(notification.id)
      markLocalRead(notification.id)
    } catch {
      /* still close so the user is not stuck */
    } finally {
      dismissAckModal()
      setIsClosing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ack-notification-title"
      aria-describedby="ack-notification-message"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <AlertTriangle className="w-6 h-6" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                Important alert
              </p>
              <h2 id="ack-notification-title" className="text-lg font-black leading-tight mt-0.5">
                {notification.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p id="ack-notification-message" className="text-sm leading-relaxed text-slate-700">
            {notification.message}
          </p>
          {notification.priority && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Priority: {notification.priority}
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={handleOk}
            disabled={isClosing}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-200 transition-colors"
          >
            {isClosing ? 'Please wait…' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
