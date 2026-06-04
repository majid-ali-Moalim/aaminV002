'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { notificationsService } from '@/lib/api'
import { CATEGORY_LABELS, type NotificationCategory } from '@/lib/notifications/types'
import { Button } from '@/components/ui/button'

const CHANNELS = [
  { id: 'IN_APP', label: 'In-App', icon: Bell },
  { id: 'EMAIL', label: 'Email', icon: Mail },
  { id: 'SMS', label: 'SMS', icon: MessageSquare },
  { id: 'PUSH', label: 'Push', icon: Smartphone },
] as const

const CATEGORIES = Object.keys(CATEGORY_LABELS) as NotificationCategory[]

type PrefRow = { category: NotificationCategory; channel: string; enabled: boolean }

export default function NotificationSettingsView() {
  const [prefs, setPrefs] = useState<PrefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    notificationsService
      .getPreferences()
      .then((data) => setPrefs(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const isEnabled = (category: NotificationCategory, channel: string) =>
    prefs.find((p) => p.category === category && p.channel === channel)?.enabled ?? true

  const toggle = (category: NotificationCategory, channel: string) => {
    setPrefs((prev) => {
      const existing = prev.find((p) => p.category === category && p.channel === channel)
      if (existing) {
        return prev.map((p) =>
          p.category === category && p.channel === channel ? { ...p, enabled: !p.enabled } : p,
        )
      }
      return [...prev, { category, channel, enabled: false }]
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload: PrefRow[] = []
      for (const cat of CATEGORIES) {
        for (const ch of CHANNELS) {
          payload.push({
            category: cat,
            channel: ch.id,
            enabled: isEnabled(cat, ch.id),
          })
        }
      }
      const updated = await notificationsService.updatePreferences(payload)
      setPrefs(updated ?? payload)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading preferences...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Notification Settings</h1>
        <p className="text-gray-500 mt-1">Configure delivery channels per alert category</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Category
                </th>
                {CHANNELS.map((ch) => (
                  <th
                    key={ch.id}
                    className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center"
                  >
                    <ch.icon className="w-4 h-4 mx-auto mb-1" />
                    {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {CATEGORIES.map((cat) => (
                <tr key={cat}>
                  <td className="py-4 px-6 font-bold text-sm text-gray-800 dark:text-gray-200">
                    {CATEGORY_LABELS[cat]}
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="py-4 px-4 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled(cat, ch.id)}
                        onClick={() => toggle(cat, ch.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isEnabled(cat, ch.id) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled(cat, ch.id) ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="rounded-xl font-bold h-11 px-8">
        {saving ? 'Saving...' : 'Save preferences'}
      </Button>
    </div>
  )
}
