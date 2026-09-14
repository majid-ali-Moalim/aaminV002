/** Human-readable labels for how a case entered the system. */
export function formatRequestSourceLabel(source?: string | null): string {
  switch (String(source ?? '').toUpperCase()) {
    case 'PHONE_CALL':
      return 'Phone call'
    case 'REFERRAL':
      return 'Referral'
    case 'WEBSITE':
    case 'OTHER':
      return 'Website (online)'
    case 'WALK_IN':
      return 'Walk in'
    case 'STAFF':
      return 'Staff'
    default:
      return source?.replace(/_/g, ' ') || '—'
  }
}

export const REPORT_REQUEST_SOURCES = [
  { value: 'PHONE_CALL', label: 'Phone call' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WEBSITE', label: 'Website (online)' },
] as const
