import { mdmService, getApiErrorMessage } from '@/lib/api'

export type SettingValue = string | boolean | number

export type SettingFieldDef = {
  key: string
  label: string
  type?: 'boolean' | 'number' | 'text' | 'email' | 'select'
  options?: { value: string; label: string }[]
  hint?: string
}

/** Seeded defaults — must stay aligned with backend system-settings.defaults.ts */
export const SYSTEM_SETTING_DEFAULT_VALUES: Record<string, SettingValue> = {
  'general.systemName': 'Aamin EMS Dispatch',
  'general.organizationName': 'Aamin Ambulance Services',
  'general.defaultLanguage': 'en',
  'general.timeZone': 'Africa/Mogadishu',
  'general.dateFormat': 'DD/MM/YYYY',
  'notifications.emailEnabled': true,
  'notifications.inAppEnabled': true,
  'notifications.alertSounds': true,
  'notifications.criticalSmsEnabled': false,
  'security.passwordMinLength': 8,
  'security.sessionTimeoutMins': 60,
  'security.maxLoginAttempts': 5,
  'security.lockoutDurationMins': 15,
  'security.twoFactorEnabled': false,
  'security.forcePasswordChangeDays': 0,
  'attendance.shiftDurationHours': 8,
  'attendance.gracePeriodMins': 15,
  'attendance.lateThresholdMins': 10,
  'attendance.overtimeRequiresApproval': true,
  'dispatch.autoRefreshSeconds': 30,
  'dispatch.defaultResponseTargetMins': 15,
  'dispatch.allowPublicTracking': true,
  'dispatch.requireHandoverNotes': true,
  'dispatch.escalateUnassignedMins': 10,
  'public.contactPhone': '+252 61 0000000',
  'public.contactEmail': 'info@aamin.so',
  'public.showFleetStats': true,
  'public.showHireAmbulanceForm': true,
  'public.maintenanceMode': false,
  'email.fromName': 'Aamin Ambulance',
  'email.replyTo': 'info@aamin.so',
  'email.sendPasswordReset': true,
  'email.sendWelcomeEmail': true,
}

export function defaultValueForField(field: SettingFieldDef): SettingValue {
  if (field.key in SYSTEM_SETTING_DEFAULT_VALUES) {
    return SYSTEM_SETTING_DEFAULT_VALUES[field.key]
  }
  if (field.type === 'boolean') return false
  if (field.type === 'number') return 0
  if (field.type === 'select' && field.options?.length) return field.options[0].value
  return ''
}

export function buildDefaults(fields: SettingFieldDef[]): Record<string, SettingValue> {
  const map: Record<string, SettingValue> = {}
  for (const field of fields) {
    map[field.key] = defaultValueForField(field)
  }
  return map
}

export function mergeSettingRows(
  rows: Array<{ key: string; value: unknown }>,
  defaults: Record<string, SettingValue>,
): Record<string, SettingValue> {
  const merged = { ...defaults }
  for (const row of rows) {
    if (!(row.key in merged)) continue
    const def = defaults[row.key]
    if (typeof def === 'boolean') {
      merged[row.key] = row.value === true || row.value === 'true'
    } else if (typeof def === 'number') {
      const n = typeof row.value === 'number' ? row.value : Number(row.value)
      merged[row.key] = Number.isFinite(n) ? n : def
    } else {
      merged[row.key] = row.value == null ? '' : String(row.value)
    }
  }
  return merged
}

export async function loadSystemSettingsMap(
  sections: Array<{ id: string; fields: SettingFieldDef[] }>,
): Promise<Record<string, SettingValue>> {
  const allDefaults = sections.reduce<Record<string, SettingValue>>((acc, section) => {
    Object.assign(acc, buildDefaults(section.fields))
    return acc
  }, {})

  const results = await Promise.all(
    sections.map((section) => mdmService.getSettingsSection(section.id)),
  )

  return mergeSettingRows(results.flat(), allDefaults)
}

export async function getDispatchRefreshMs(): Promise<number> {
  try {
    const rows = await mdmService.getSettingsSection('dispatch')
    const row = rows.find((r: { key: string }) => r.key === 'dispatch.autoRefreshSeconds')
    const fallback = SYSTEM_SETTING_DEFAULT_VALUES['dispatch.autoRefreshSeconds'] as number
    const seconds = row ? Number(row.value) : fallback
    if (!Number.isFinite(seconds) || seconds < 5) return fallback * 1000
    return Math.min(seconds, 300) * 1000
  } catch {
    const fallback = SYSTEM_SETTING_DEFAULT_VALUES['dispatch.autoRefreshSeconds'] as number
    return fallback * 1000
  }
}

export { getApiErrorMessage }
