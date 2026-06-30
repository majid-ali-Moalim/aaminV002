export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  { id: 'Spouse', label: 'Spouse' },
  { id: 'Parent', label: 'Parent' },
  { id: 'Sibling', label: 'Sibling' },
  { id: 'Child', label: 'Child' },
  { id: 'Relative', label: 'Relative' },
  { id: 'Friend', label: 'Friend' },
  { id: 'Other', label: 'Other' },
] as const

export const RELATIONSHIP_IDS = EMERGENCY_CONTACT_RELATIONSHIPS.map((r) => r.id)

export function isValidEmergencyContactRelationship(value: string): boolean {
  return RELATIONSHIP_IDS.includes(value as (typeof RELATIONSHIP_IDS)[number])
}
