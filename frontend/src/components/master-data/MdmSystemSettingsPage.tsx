'use client'

import React, { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { mdmService } from '@/lib/api'

const SECTIONS = [
  {
    id: 'general',
    title: 'General Settings',
    fields: [
      { key: 'general.systemName', label: 'System Name' },
      { key: 'general.organizationName', label: 'Organization Name' },
      { key: 'general.defaultLanguage', label: 'Default Language' },
      { key: 'general.timeZone', label: 'Time Zone' },
      { key: 'general.dateFormat', label: 'Date Format' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notification Settings',
    fields: [
      { key: 'notifications.emailEnabled', label: 'Email Notifications', type: 'boolean' },
      { key: 'notifications.inAppEnabled', label: 'In-App Notifications', type: 'boolean' },
      { key: 'notifications.alertSounds', label: 'Alert Sounds', type: 'boolean' },
    ],
  },
  {
    id: 'security',
    title: 'Security Settings',
    fields: [
      { key: 'security.passwordMinLength', label: 'Password Min Length', type: 'number' },
      { key: 'security.sessionTimeoutMins', label: 'Session Timeout (mins)', type: 'number' },
      { key: 'security.maxLoginAttempts', label: 'Max Login Attempts', type: 'number' },
      { key: 'security.twoFactorEnabled', label: 'Two-Factor Authentication', type: 'boolean' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance Settings',
    fields: [
      { key: 'attendance.shiftDurationHours', label: 'Shift Duration (hours)', type: 'number' },
      { key: 'attendance.gracePeriodMins', label: 'Grace Period (mins)', type: 'number' },
      { key: 'attendance.lateThresholdMins', label: 'Late Threshold (mins)', type: 'number' },
    ],
  },
] as const

export default function MdmSystemSettingsPage() {
  const [values, setValues] = useState<Record<string, string | boolean | number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all(SECTIONS.map((s) => mdmService.getSettingsSection(s.id)))
      .then((results) => {
        const map: Record<string, string | boolean | number> = {}
        results.flat().forEach((row: any) => {
          map[row.key] = row.value
        })
        setValues(map)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveSection = async (sectionId: string) => {
    setSaving(true)
    try {
      const section = SECTIONS.find((s) => s.id === sectionId)!
      const settings = section.fields.map((f) => ({
        key: f.key,
        value: values[f.key] ?? '',
      }))
      await mdmService.updateSettingsSection(sectionId, settings)
      toast.success(`${section.title} saved`)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          System Settings
        </h1>
        <p className="text-gray-500 mt-1">Global configuration for the dispatch platform</p>
      </div>

      <div className="grid gap-6">
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-black text-lg">{section.title}</h2>
              <Button size="sm" className="rounded-xl" disabled={saving} onClick={() => saveSection(section.id)}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              {section.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  {f.type === 'boolean' ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!values[f.key]}
                      onClick={() => setValues({ ...values, [f.key]: !values[f.key] })}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                        values[f.key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white mt-1 transition-transform ${
                          values[f.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800"
                      value={values[f.key]?.toString() ?? ''}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
