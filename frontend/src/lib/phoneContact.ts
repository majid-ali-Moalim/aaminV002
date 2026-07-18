import { normalizePhoneDigits } from '@/lib/driverFormValidation'

/** Normalize to E.164 Somalia format: +252XXXXXXXXX */
export function toSomaliaE164(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = normalizePhoneDigits(phone)
  if (digits.length < 7) return null
  return `+252${digits}`
}

export function formatSomaliaPhoneDisplay(phone?: string | null): string | null {
  const e164 = toSomaliaE164(phone)
  if (!e164) return phone?.trim() || null
  return `+252 ${e164.slice(4)}`
}

export function telHref(phone?: string | null): string | null {
  const e164 = toSomaliaE164(phone)
  return e164 ? `tel:${e164}` : null
}

export function whatsappHref(phone?: string | null): string | null {
  const e164 = toSomaliaE164(phone)
  if (!e164) return null
  return `https://wa.me/${e164.replace('+', '')}`
}

export function resolvePatientPhone(caseData?: {
  patient?: { phone?: string | null } | null
  callerPhone?: string | null
} | null): string | null {
  if (!caseData) return null
  return caseData.patient?.phone?.trim() || caseData.callerPhone?.trim() || null
}
