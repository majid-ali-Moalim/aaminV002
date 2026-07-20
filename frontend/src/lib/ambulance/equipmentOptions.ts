export const AMBULANCE_TYPE_OPTIONS = ['BLS', 'ALS'] as const
export type AmbulanceTypeOption = (typeof AMBULANCE_TYPE_OPTIONS)[number]

export const AMBULANCE_EQUIPMENT_OPTIONS = [
  { key: 'stretcherAvailable', label: 'Patient Stretcher', emoji: '🛏️' },
  { key: 'defibrillatorAvailable', label: 'Defibrillator', emoji: '❤️' },
  { key: 'oxygenAvailable', label: 'Oxygen Cylinder', emoji: '🫁' },
  { key: 'suctionAvailable', label: 'Suction Unit', emoji: '💨' },
  { key: 'firstAidKitAvailable', label: 'First Aid Kit', emoji: '🩹' },
] as const

export type AmbulanceEquipmentKey = (typeof AMBULANCE_EQUIPMENT_OPTIONS)[number]['key']

export function buildEquipmentSummary(form: Record<AmbulanceEquipmentKey, boolean>): string[] {
  return AMBULANCE_EQUIPMENT_OPTIONS.filter((item) => form[item.key]).map((item) => item.label)
}

export function mergeEquipmentIntoNotes(
  equipmentLabels: string[],
  userNotes: string,
): string | undefined {
  const trimmedNotes = userNotes.trim()
  const equipmentBlock =
    equipmentLabels.length > 0 ? `Equipment: ${equipmentLabels.join(', ')}` : ''
  const combined = [equipmentBlock, trimmedNotes].filter(Boolean).join('\n\n')
  return combined || undefined
}
