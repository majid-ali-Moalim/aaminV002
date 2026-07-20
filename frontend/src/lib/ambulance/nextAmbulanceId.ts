const DEFAULT_PREFIX = 'AMB-'

/** Next ID in sequence AMB-001, AMB-002, … from existing fleet numbers. */
export function computeNextAmbulanceNumber(
  ambulances: { ambulanceNumber?: string | null }[],
  prefix = DEFAULT_PREFIX,
): string {
  let max = 0
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}(\\d+)$`, 'i')

  for (const row of ambulances) {
    const num = row.ambulanceNumber?.trim()
    if (!num) continue
    const match = num.match(re)
    if (match) {
      max = Math.max(max, parseInt(match[1], 10))
    }
  }

  return `${prefix}${String(max + 1).padStart(3, '0')}`
}
