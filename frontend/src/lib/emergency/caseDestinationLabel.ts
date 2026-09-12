/** Human-readable destination — hospital name + branch when available. */
export function formatCaseDestination(caseRow: {
  destination?: string | null
  destinationHospital?: { name?: string | null } | null
  destinationHospitalBranchName?: string | null
}): string {
  const hospital = caseRow.destinationHospital?.name?.trim()
  const branch = caseRow.destinationHospitalBranchName?.trim()
  const dest = caseRow.destination?.trim()

  if (hospital && branch) return `${hospital} — ${branch}`
  if (hospital) return hospital
  if (dest && branch && !dest.toLowerCase().includes(branch.toLowerCase())) {
    return `${dest} — ${branch}`
  }
  if (dest) return dest
  if (branch) return branch
  return '—'
}

export function formatDispatcherLabel(dispatcher?: {
  firstName?: string | null
  lastName?: string | null
  user?: { username?: string | null } | null
} | null): string | undefined {
  if (!dispatcher) return undefined
  const name = `${dispatcher.firstName || ''} ${dispatcher.lastName || ''}`.trim()
  return name || dispatcher.user?.username || undefined
}
