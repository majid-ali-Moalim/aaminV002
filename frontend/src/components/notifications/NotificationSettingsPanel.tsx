'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Mail, Megaphone, Truck, MessageSquare, Users, AlertTriangle, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationsService } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import type { NotificationCategory } from '@/lib/notifications/types'

const SETTING_ROWS = [
  { key: 'MISSION' as NotificationCategory, label: 'Mission Notifications', icon: Truck },
  { key: 'COMMUNICATION' as NotificationCategory, label: 'Communication Notifications', icon: MessageSquare },
  { key: 'ATTENDANCE' as NotificationCategory, label: 'Attendance Notifications', icon: Users },
  { key: 'SYSTEM' as NotificationCategory, label: 'Critical Alerts', icon: AlertTriangle },
  { key: 'BROADCAST' as NotificationCategory, label: 'Broadcast Messages', icon: Megaphone },
]

export default function NotificationSettingsPanel() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<{ category: NotificationCategory; channel: string; enabled: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    notificationsService
      .getPreferences()
      .then((data) => {
        if (Array.isArray(data)) {
          setPrefs(data)
        } else {
          setPrefs([])
        }
      })
      .catch((err: unknown) => {
        const message =
          err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string'
            ? (err as Error).message
            : 'Failed to load notification preferences'
        toast.error(message)
      })
      .finally(() => setLoading(false))
  }, [])

  const isOn = (category: NotificationCategory, channel: string) =>
    prefs.find((p) => p.category === category && p.channel === channel)?.enabled ?? true

  const persist = useCallback(async (nextPrefs: typeof prefs) => {
    setSaving(true)
    try {
      const payload = SETTING_ROWS.flatMap((row) => [
        {
          category: row.key,
          channel: 'IN_APP',
          enabled: nextPrefs.find((p) => p.category === row.key && p.channel === 'IN_APP')?.enabled ?? true,
        },
        {
          category: row.key,
          channel: 'EMAIL',
          enabled: nextPrefs.find((p) => p.category === row.key && p.channel === 'EMAIL')?.enabled ?? true,
        },
      ])
      const updated = await notificationsService.updatePreferences(payload)
      setPrefs(updated ?? payload)
      toast.success('Preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }, [])

  const scheduleSave = useCallback(
    (nextPrefs: typeof prefs) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persist(nextPrefs), 400)
    },
    [persist],
  )

  const toggle = (category: NotificationCategory, channel: string) => {
    setPrefs((prev) => {
      const hit = prev.find((p) => p.category === category && p.channel === channel)
      const next = hit
        ? prev.map((p) =>
            p.category === category && p.channel === channel ? { ...p, enabled: !p.enabled } : p,
          )
        : [...prev, { category, channel, enabled: false }]
      scheduleSave(next)
      return next
    })
  }

  const handleTestEmail = async () => {
    setTesting(true)
    try {
      const result = await notificationsService.sendTestEmail()
      if (result.success) {
        toast.success(result.message || `Test email sent to ${result.email}`)
      } else {
        toast.error(result.message || 'Could not send test email')
      }
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  const adminEmail = user?.email?.trim()

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading settings...</div>
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-50 dark:border-gray-800">
        <h2 className="font-black text-lg text-gray-900 dark:text-white">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mt-1">Control which alerts you receive and how</p>
        {adminEmail ? (
          <p className="text-xs text-gray-400 mt-2">
            Email notifications will be sent to <span className="font-bold text-gray-600 dark:text-gray-300">{adminEmail}</span>
          </p>
        ) : (
          <p className="text-xs text-amber-600 mt-2 font-semibold">
            Add an email address to your admin profile to receive email notifications.
          </p>
        )}
      </div>
      <ul className="divide-y divide-gray-50 dark:divide-gray-800">
        {SETTING_ROWS.map((row) => (
          <li key={row.key} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <row.icon className="w-5 h-5 text-gray-500" />
              </div>
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{row.label}</span>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                <Bell className="w-4 h-4" />
                In-App
                <Toggle checked={isOn(row.key, 'IN_APP')} onChange={() => toggle(row.key, 'IN_APP')} />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
                <Mail className="w-4 h-4" />
                Email
                <Toggle checked={isOn(row.key, 'EMAIL')} onChange={() => toggle(row.key, 'EMAIL')} />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-5 border-t border-gray-50 dark:border-gray-800 flex flex-wrap items-center gap-3">
        {saving && <span className="text-xs font-semibold text-gray-400">Saving…</span>}
        <Button
          type="button"
          variant="outline"
          onClick={handleTestEmail}
          disabled={testing || !adminEmail}
          className="rounded-xl font-bold"
        >
          <Send className="w-4 h-4 mr-2" />
          {testing ? 'Sending…' : 'Send test email'}
        </Button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
