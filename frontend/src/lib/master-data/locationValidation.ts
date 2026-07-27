import type { MdmEntityKey } from './config'

type Row = Record<string, any>

function parseCoverageIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return [...new Set(raw.filter((id): id is string => typeof id === 'string' && id.length > 0))]
  }
  return []
}

export function collectStationDistrictIds(station: Row): string[] {
  const homeId = String(station.districtId ?? '')
  const coverage = parseCoverageIds(station.coverageDistrictIds)
  return [...new Set([homeId, ...coverage].filter(Boolean))]
}

/** Map districtId -> station name for districts already assigned to another station. */
export function buildDistrictAssignmentMap(
  stations: Row[],
  excludeStationId?: string,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const station of stations) {
    if (!station.isActive) continue
    if (excludeStationId && station.id === excludeStationId) continue
    for (const districtId of collectStationDistrictIds(station)) {
      map.set(districtId, String(station.name ?? 'Another station'))
    }
  }
  return map
}

export function validateLocationForm(
  entityKey: MdmEntityKey,
  form: Record<string, string>,
  context?: {
    stations?: Row[]
    editStationId?: string
    districtNameById?: Map<string, string>
  },
): string | null {
  if (entityKey === 'regions') {
    if (!form.code?.trim()) return 'Region code is required'
    if (!form.name?.trim()) return 'Region name is required'
    return null
  }

  if (entityKey === 'districts') {
    if (!form.code?.trim()) return 'District code is required'
    if (!form.name?.trim()) return 'District name is required'
    if (!form.regionId?.trim()) return 'Region is required'
    return null
  }

  if (entityKey === 'stations') {
    if (!form.name?.trim()) return 'Station name is required'
    if (!form.regionId?.trim()) return 'Region is required'
    if (!form.districtId?.trim()) return 'Home district is required'

    const homeId = form.districtId.trim()
    const coverageIds = (form.coverageDistrictIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (coverageIds.includes(homeId)) {
      return 'Home district cannot also be selected in coverage districts'
    }

    const uniqueCoverage = new Set(coverageIds)
    if (uniqueCoverage.size !== coverageIds.length) {
      return 'Coverage districts must be unique'
    }

    const stations = context?.stations ?? []
    if (stations.length) {
      const assigned = buildDistrictAssignmentMap(stations, context?.editStationId)
      const districtNameById = context?.districtNameById ?? new Map<string, string>()
      const proposed = [homeId, ...coverageIds]

      for (const districtId of proposed) {
        const owner = assigned.get(districtId)
        if (owner) {
          const label = districtNameById.get(districtId) ?? 'This district'
          return `${label} is already assigned to station "${owner}". Each district can belong to only one station.`
        }
      }
    }

    return null
  }

  return null
}

export function isDistrictAvailableForStation(
  districtId: string,
  assignmentMap: Map<string, string>,
  currentHomeDistrictId?: string,
): boolean {
  if (currentHomeDistrictId && districtId === currentHomeDistrictId) return true
  return !assignmentMap.has(districtId)
}
