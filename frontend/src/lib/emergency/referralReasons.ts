export const REFERRAL_REASON_OPTIONS = [
  { value: 'SPECIALIST_CARE', label: 'Specialist care required' },
  { value: 'HIGHER_LEVEL_FACILITY', label: 'Higher-level facility needed' },
  { value: 'ICU_OR_CRITICAL_CARE', label: 'ICU / critical care bed needed' },
  { value: 'SURGERY_OR_PROCEDURE', label: 'Surgery or procedure required' },
  { value: 'DIAGNOSTIC_IMAGING', label: 'Advanced diagnostic / imaging' },
  { value: 'MATERNAL_NEONATAL', label: 'Maternal / neonatal care' },
  { value: 'STABILIZATION_TRANSFER', label: 'Post-stabilization transfer' },
  { value: 'CAPACITY_OVERFLOW', label: 'Referring facility at capacity' },
  { value: 'OTHER', label: 'Other (specify)' },
] as const

export function isOtherReferralReason(value?: string | null): boolean {
  return value === 'OTHER'
}

export function formatReferralReasonStored(reason: string, reasonOther?: string): string {
  if (!reason) return ''
  if (reason === 'OTHER') {
    const other = reasonOther?.trim()
    return other ? `Other: ${other}` : 'Other'
  }
  return REFERRAL_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason
}

export function parseReferralReasonFields(stored?: string): {
  referralReason: string
  referralReasonOther: string
} {
  if (!stored?.trim()) return { referralReason: '', referralReasonOther: '' }
  if (stored.startsWith('Other:')) {
    return { referralReason: 'OTHER', referralReasonOther: stored.slice(6).trim() }
  }
  const opt = REFERRAL_REASON_OPTIONS.find((o) => o.label === stored || o.value === stored)
  return { referralReason: opt?.value ?? stored, referralReasonOther: '' }
}
