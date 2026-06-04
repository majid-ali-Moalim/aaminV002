'use client'

import { useState } from 'react'
import { Settings, Shield, Key, Clock, Lock, Save, Loader2, Timer, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'

export default function SecuritySettingsPage() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    requireMfa: true,
    sessionTimeoutMinutes: 60,
    minPasswordLength: 10,
    requireSpecialChar: true,
    requireUppercase: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    auditRetentionDays: 90,
    ipAllowlistEnabled: false,
    delegationMaxDays: 14,
    temporaryMaxHours: 72,
    autoRevokeOnExpiry: true,
    requireApprovalForSensitive: true,
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="System-Wide Rules"
        title="Security Settings"
        subtitle="Password policy, session timeout, IP restrictions, login attempts, MFA, and permission expiry rules."
        icon={Settings}
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PolicySection icon={Shield} title="MFA Settings">
          <Toggle label="Require MFA for administrators" description="Enforce two-factor on admin accounts" checked={settings.requireMfa} onChange={(v) => setSettings({ ...settings, requireMfa: v })} />
          <NumberField label="Session timeout (minutes)" value={settings.sessionTimeoutMinutes} onChange={(v) => setSettings({ ...settings, sessionTimeoutMinutes: v })} min={5} max={480} icon={Clock} />
          <NumberField label="Max login attempts" value={settings.maxLoginAttempts} onChange={(v) => setSettings({ ...settings, maxLoginAttempts: v })} min={3} max={20} />
          <NumberField label="Lockout duration (minutes)" value={settings.lockoutDurationMinutes} onChange={(v) => setSettings({ ...settings, lockoutDurationMinutes: v })} min={5} max={120} />
        </PolicySection>

        <PolicySection icon={Key} title="Password Policy">
          <NumberField label="Minimum password length" value={settings.minPasswordLength} onChange={(v) => setSettings({ ...settings, minPasswordLength: v })} min={8} max={32} />
          <Toggle label="Require special characters" description="At least one symbol (!@#$…)" checked={settings.requireSpecialChar} onChange={(v) => setSettings({ ...settings, requireSpecialChar: v })} />
          <Toggle label="Require uppercase letters" checked={settings.requireUppercase} onChange={(v) => setSettings({ ...settings, requireUppercase: v })} />
        </PolicySection>

        <PolicySection icon={Globe} title="IP Restrictions">
          <Toggle label="Enable IP allowlist" description="Restrict admin portal to approved IP ranges" checked={settings.ipAllowlistEnabled} onChange={(v) => setSettings({ ...settings, ipAllowlistEnabled: v })} />
        </PolicySection>

        <PolicySection icon={Timer} title="Permission Expiry Rules">
          <NumberField label="Max delegation duration (days)" value={settings.delegationMaxDays} onChange={(v) => setSettings({ ...settings, delegationMaxDays: v })} min={1} max={30} />
          <NumberField label="Max temporary grant (hours)" value={settings.temporaryMaxHours} onChange={(v) => setSettings({ ...settings, temporaryMaxHours: v })} min={1} max={168} />
          <Toggle label="Auto-revoke on expiry" description="Automatically remove expired grants" checked={settings.autoRevokeOnExpiry} onChange={(v) => setSettings({ ...settings, autoRevokeOnExpiry: v })} />
          <Toggle label="Require approval for sensitive actions" description="Delete ambulance, delete employee, etc." checked={settings.requireApprovalForSensitive} onChange={(v) => setSettings({ ...settings, requireApprovalForSensitive: v })} />
        </PolicySection>

        <PolicySection icon={Lock} title="Audit Retention" className="lg:col-span-2">
          <NumberField label="Audit log retention (days)" value={settings.auditRetentionDays} onChange={(v) => setSettings({ ...settings, auditRetentionDays: v })} min={30} max={365} />
        </PolicySection>
      </div>
    </div>
  )
}

function PolicySection({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: typeof Shield
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 ${className}`}>
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <Icon className="w-5 h-5 text-red-600" />
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500" />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  icon: Icon,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  icon?: typeof Clock
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
      />
    </div>
  )
}
