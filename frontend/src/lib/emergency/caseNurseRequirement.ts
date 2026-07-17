import type { EmergencyRequest } from '@/types'

/** True when the case was flagged as needing a nurse at intake. */
export function caseRequiresNurse(request: Pick<EmergencyRequest, 'notes' | 'manualDispatchNotes'>): boolean {
  const blob = `${request.notes ?? ''}\n${request.manualDispatchNotes ?? ''}`.toUpperCase()
  return blob.includes('REQUIRES NURSE: YES') || blob.includes('NURSE REQUIRED')
}
