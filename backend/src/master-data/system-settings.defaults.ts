/** Default system settings seeded and merged when a section is loaded. */
export type SystemSettingDefault = {
  key: string;
  section: string;
  value: string | number | boolean;
};

export const SYSTEM_SETTING_DEFAULTS: SystemSettingDefault[] = [
  { key: 'general.systemName', section: 'general', value: 'Aamin EMS Dispatch' },
  { key: 'general.organizationName', section: 'general', value: 'Aamin Ambulance Services' },
  { key: 'general.defaultLanguage', section: 'general', value: 'en' },
  { key: 'general.timeZone', section: 'general', value: 'Africa/Mogadishu' },
  { key: 'general.dateFormat', section: 'general', value: 'DD/MM/YYYY' },
  { key: 'notifications.emailEnabled', section: 'notifications', value: true },
  { key: 'notifications.inAppEnabled', section: 'notifications', value: true },
  { key: 'notifications.alertSounds', section: 'notifications', value: true },
  { key: 'notifications.criticalSmsEnabled', section: 'notifications', value: false },
  { key: 'security.passwordMinLength', section: 'security', value: 8 },
  { key: 'security.sessionTimeoutMins', section: 'security', value: 60 },
  { key: 'security.maxLoginAttempts', section: 'security', value: 5 },
  { key: 'security.lockoutDurationMins', section: 'security', value: 15 },
  { key: 'security.twoFactorEnabled', section: 'security', value: false },
  { key: 'security.forcePasswordChangeDays', section: 'security', value: 0 },
  { key: 'attendance.shiftDurationHours', section: 'attendance', value: 8 },
  { key: 'attendance.gracePeriodMins', section: 'attendance', value: 15 },
  { key: 'attendance.lateThresholdMins', section: 'attendance', value: 10 },
  { key: 'attendance.overtimeRequiresApproval', section: 'attendance', value: true },
  { key: 'dispatch.autoRefreshSeconds', section: 'dispatch', value: 30 },
  { key: 'dispatch.defaultResponseTargetMins', section: 'dispatch', value: 15 },
  { key: 'dispatch.allowPublicTracking', section: 'dispatch', value: true },
  { key: 'dispatch.requireHandoverNotes', section: 'dispatch', value: true },
  { key: 'dispatch.escalateUnassignedMins', section: 'dispatch', value: 10 },
  { key: 'public.contactPhone', section: 'public', value: '+252 61 0000000' },
  { key: 'public.contactEmail', section: 'public', value: 'info@aamin.so' },
  { key: 'public.showFleetStats', section: 'public', value: true },
  { key: 'public.showHireAmbulanceForm', section: 'public', value: true },
  { key: 'public.maintenanceMode', section: 'public', value: false },
  { key: 'email.fromName', section: 'email', value: 'Aamin Ambulance' },
  { key: 'email.replyTo', section: 'email', value: 'info@aamin.so' },
  { key: 'email.sendPasswordReset', section: 'email', value: true },
  { key: 'email.sendWelcomeEmail', section: 'email', value: true },
];

export function defaultsForSection(section: string): SystemSettingDefault[] {
  return SYSTEM_SETTING_DEFAULTS.filter((d) => d.section === section);
}

export const VALID_SETTINGS_SECTIONS = [
  'general',
  'notifications',
  'security',
  'attendance',
  'dispatch',
  'public',
  'email',
] as const;

export type SettingsSectionId = (typeof VALID_SETTINGS_SECTIONS)[number];

export function isValidSettingsSection(section: string): section is SettingsSectionId {
  return (VALID_SETTINGS_SECTIONS as readonly string[]).includes(section);
}
