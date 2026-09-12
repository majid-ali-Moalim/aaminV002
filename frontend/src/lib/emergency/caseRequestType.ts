/** Derive Emergency / Non-Emergency / Referral from case notes or source. */
export function parseCaseRequestType(
  notes?: string | null,
  requestSource?: string | null,
): string {
  if (notes?.includes('Request Type: Referral') || requestSource === 'REFERRAL') {
    return 'Referral'
  }
  if (notes?.includes('Request Type: Non-Emergency')) {
    return 'Non-Emergency'
  }
  if (notes?.includes('Request Type: Emergency')) {
    return 'Emergency'
  }
  if (requestSource === 'OTHER') {
    return 'Non-Emergency'
  }
  return 'Emergency'
}
