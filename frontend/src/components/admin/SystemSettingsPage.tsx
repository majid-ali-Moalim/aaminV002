'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Save,
  Settings,
  Bell,
  Shield,
  Clock,
  Radio,
  Globe,
  Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { mdmService } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type FieldDef = {
  key: string
  label: string
  type?: 'boolean' | 'number' | 'text' | 'email' | 'select'
  options?: { value: string; label: string }[]
  hint?: string
}

type SettingsSection = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  fields: FieldDef[]
}

const SECTIONS: SettingsSection[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Organization identity, locale, and display defaults.',
    icon: Settings,
    fields: [
      { key: 'general.systemName', label: 'System name' },
      { key: 'general.organizationName', label: 'Organization name' },
      {
        key: 'general.defaultLanguage',
        label: 'Default language',
        type: 'select',
        options: [
          { value: 'en', label: 'English' },
          { value: 'so', label: 'Somali' },
        ],
      },
      { key: 'general.timeZone', label: 'Time zone', hint: 'e.g. Africa/Mogadishu' },
      {
        key: 'general.dateFormat',
        label: 'Date format',
        type: 'select',
        options: [
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'How alerts and messages are delivered across portals.',
    icon: Bell,
    fields: [
      { key: 'notifications.emailEnabled', label: 'Email notifications', type: 'boolean' },
      { key: 'notifications.inAppEnabled', label: 'In-app notifications', type: 'boolean' },
      { key: 'notifications.alertSounds', label: 'Alert sounds on dispatch board', type: 'boolean' },
      { key: 'notifications.criticalSmsEnabled', label: 'SMS for critical alerts', type: 'boolean' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Authentication, sessions, and account protection.',
    icon: Shield,
    fields: [
      { key: 'security.passwordMinLength', label: 'Minimum password length', type: 'number' },
      { key: 'security.sessionTimeoutMins', label: 'Session timeout (minutes)', type: 'number' },
      { key: 'security.maxLoginAttempts', label: 'Max login attempts', type: 'number' },
      { key: 'security.lockoutDurationMins', label: 'Lockout duration (minutes)', type: 'number' },
      { key: 'security.twoFactorEnabled', label: 'Require two-factor for admins', type: 'boolean' },
      { key: 'security.forcePasswordChangeDays', label: 'Force password change (days, 0 = off)', type: 'number' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Shift rules for workforce and duty tracking.',
    icon: Clock,
    fields: [
      { key: 'attendance.shiftDurationHours', label: 'Standard shift duration (hours)', type: 'number' },
      { key: 'attendance.gracePeriodMins', label: 'Clock-in grace period (minutes)', type: 'number' },
      { key: 'attendance.lateThresholdMins', label: 'Late threshold (minutes)', type: 'number' },
      { key: 'attendance.overtimeRequiresApproval', label: 'Overtime requires approval', type: 'boolean' },
    ],
  },
  {
    id: 'dispatch',
    title: 'Dispatch & Operations',
    description: 'Live operations board and mission handling defaults.',
    icon: Radio,
    fields: [
      { key: 'dispatch.autoRefreshSeconds', label: 'Live board refresh (seconds)', type: 'number' },
      { key: 'dispatch.defaultResponseTargetMins', label: 'Default response target (minutes)', type: 'number' },
      { key: 'dispatch.allowPublicTracking', label: 'Enable public ambulance tracking', type: 'boolean' },
      { key: 'dispatch.requireHandoverNotes', label: 'Require handover notes at hospital', type: 'boolean' },
      { key: 'dispatch.escalateUnassignedMins', label: 'Escalate unassigned cases after (minutes)', type: 'number' },
    ],
  },
  {
    id: 'public',
    title: 'Public website',
    description: 'Contact details and content shown on the public site.',
    icon: Globe,
    fields: [
      { key: 'public.contactPhone', label: 'Public contact phone' },
      { key: 'public.contactEmail', label: 'Public contact email', type: 'email' },
      { key: 'public.showFleetStats', label: 'Show live fleet stats on homepage', type: 'boolean' },
      { key: 'public.showHireAmbulanceForm', label: 'Show hire ambulance form', type: 'boolean' },
      { key: 'public.maintenanceMode', label: 'Maintenance mode (public site only)', type: 'boolean' },
    ],
  },
  {
    id: 'email',
    title: 'Email delivery',
    description: 'Outbound mail behavior (SMTP credentials stay in server environment).',
    icon: Mail,
    fields: [
      { key: 'email.fromName', label: 'Sender display name' },
      { key: 'email.replyTo', label: 'Reply-to address', type: 'email' },
      { key: 'email.sendPasswordReset', label: 'Send password reset emails', type: 'boolean' },
      { key: 'email.sendWelcomeEmail', label: 'Send welcome email to new staff', type: 'boolean' },
    ],
  },
]

export default function SystemSettingsPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [values, setValues] = useState<Record<string, string | boolean | number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all(SECTIONS.map((s) => mdmService.getSettingsSection(s.id)))
      .then((results) => {
        const map: Record<string, string | boolean | number> = {}
        results.flat().forEach((row: { key: string; value: string | boolean | number }) => {
          map[row.key] = row.value
        })
        setValues(map)
      })
      .catch(() => toast.error('Failed to load system settings'))
      .finally(() => setLoading(false))
  }, [])

  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]

  const saveSection = async () => {
    setSaving(true)
    try {
      const settings = section.fields.map((f) => ({
        key: f.key,
        value: values[f.key] ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : ''),
      }))
      await mdmService.updateSettingsSection(section.id, settings)
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
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">My System</p>
        <h1 className="text-3xl font-black text-admin-text tracking-tight mt-1">
          System Settings
        </h1>
        <p className="text-admin-text-secondary mt-1">
          Global configuration for the entire Aamin EMS platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="admin-card overflow-hidden">
            <div className="p-3 space-y-0.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                const active = s.id === activeSection
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors',
                      active
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold'
                        : 'text-admin-text-secondary hover:bg-admin-hover',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9">
          <div className="admin-card overflow-hidden">
            <div className="admin-card-header flex-col !items-stretch sm:flex-row sm:items-center justify-between gap-3 !py-5">
              <div>
                <h2 className="font-black text-lg text-admin-text">{section.title}</h2>
                <p className="text-sm text-admin-text-secondary mt-0.5">{section.description}</p>
              </div>
              <Button
                size="sm"
                className="rounded-xl bg-red-600 hover:bg-red-700 shrink-0"
                disabled={saving}
                onClick={saveSection}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save {section.title}
              </Button>
            </div>

            <div className="p-5 grid sm:grid-cols-2 gap-4">
              {section.fields.map((f) => (
                <div key={f.key} className={f.type === 'boolean' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-admin-text-secondary uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  {f.type === 'boolean' ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!values[f.key]}
                      onClick={() => setValues({ ...values, [f.key]: !values[f.key] })}
                      className={cn(
                        'relative inline-flex h-6 w-11 rounded-full transition-colors',
                        values[f.key] ? 'bg-red-600' : 'bg-admin-border',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white mt-1 transition-transform',
                          values[f.key] ? 'translate-x-6' : 'translate-x-1',
                        )}
                      />
                    </button>
                  ) : f.type === 'select' && f.options ? (
                    <select
                      className="admin-input w-full h-10"
                      value={values[f.key]?.toString() ?? ''}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    >
                      {f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                      className="admin-input w-full h-10"
                      value={values[f.key]?.toString() ?? ''}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          [f.key]:
                            f.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                    />
                  )}
                  {f.hint && (
                    <p className="text-[11px] text-admin-text-muted mt-1">{f.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
