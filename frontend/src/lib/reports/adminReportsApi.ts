import axios from 'axios'
import { API_BASE_URL, systemSetupService } from '@/lib/api'

export type AdminReportFilterOptions = {
  regions: Array<{
    id: string
    name: string
    districts?: Array<{ id: string; name: string; regionId: string }>
  }>
  districts: Array<{ id: string; name: string; regionId: string }>
  incidentCategories: Array<{ id: string; name: string }>
  ambulances: Array<{
    id: string
    ambulanceNumber: string
    plateNumber: string
    vehicleType: string | null
    status: string
  }>
  hospitals: Array<{ id: string; name: string; status: string }>
  employeeRoles: Array<{ id: string; name: string }>
  priorities: Array<{ value: string; label: string }>
  emergencyStatuses: Array<{ value: string; label: string }>
  ambulanceStatuses: Array<{ value: string; label: string }>
  vehicleTypes: Array<{ value: string; label: string }>
  patientOutcomes?: Array<{ value: string; label: string }>
  transportTypes?: Array<{ value: string; label: string; code?: string }>
  requestSources?: Array<{ value: string; label: string }>
  stations?: Array<{ value: string; label: string }>
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function emptyOptions(): AdminReportFilterOptions {
  return {
    regions: [],
    districts: [],
    incidentCategories: [],
    ambulances: [],
    hospitals: [],
    employeeRoles: [],
    priorities: [
      { value: 'LOW', label: 'LOW' },
      { value: 'MEDIUM', label: 'MEDIUM' },
      { value: 'HIGH', label: 'HIGH' },
      { value: 'CRITICAL', label: 'CRITICAL' },
    ],
    emergencyStatuses: [
      { value: 'PENDING', label: 'PENDING' },
      { value: 'ASSIGNED', label: 'ASSIGNED' },
      { value: 'DISPATCHED', label: 'DISPATCHED' },
      { value: 'COMPLETED', label: 'COMPLETED' },
      { value: 'CANCELLED', label: 'CANCELLED' },
    ],
    ambulanceStatuses: [],
    vehicleTypes: [],
    patientOutcomes: [
      { value: 'Live', label: 'Live at handover' },
      { value: 'Deceased', label: 'Dead during transfer' },
      { value: 'Unknown', label: 'Unknown at handover' },
    ],
    transportTypes: [],
  }
}

function normalizeFilterOptions(raw: any): AdminReportFilterOptions {
  const base = emptyOptions()
  if (!raw || typeof raw !== 'object') return base

  const regions = Array.isArray(raw.regions)
    ? raw.regions
        .map((r: any) => ({
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          districts: Array.isArray(r.districts)
            ? r.districts.map((d: any) => ({
                id: String(d.id ?? ''),
                name: String(d.name ?? ''),
                regionId: String(d.regionId ?? r.id ?? ''),
              }))
            : undefined,
        }))
        .filter((r: { id: string; name: string }) => r.id && r.name)
    : []

  let districts = Array.isArray(raw.districts)
    ? raw.districts
        .map((d: any) => ({
          id: String(d.id ?? ''),
          name: String(d.name ?? ''),
          regionId: String(d.regionId ?? ''),
        }))
        .filter((d: { id: string; name: string; regionId: string }) => d.id && d.name)
    : []

  // Flatten nested districts if flat list is empty
  if (!districts.length) {
    districts = regions.flatMap((r) =>
      (r.districts ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        regionId: d.regionId || r.id,
      })),
    )
  }

  return {
    ...base,
    ...raw,
    regions,
    districts,
    incidentCategories: Array.isArray(raw.incidentCategories) ? raw.incidentCategories : [],
    ambulances: Array.isArray(raw.ambulances) ? raw.ambulances : [],
    hospitals: Array.isArray(raw.hospitals) ? raw.hospitals : [],
    employeeRoles: Array.isArray(raw.employeeRoles) ? raw.employeeRoles : [],
    priorities: Array.isArray(raw.priorities) && raw.priorities.length ? raw.priorities : base.priorities,
    emergencyStatuses:
      Array.isArray(raw.emergencyStatuses) && raw.emergencyStatuses.length
        ? raw.emergencyStatuses
        : base.emergencyStatuses,
    ambulanceStatuses: Array.isArray(raw.ambulanceStatuses) ? raw.ambulanceStatuses : [],
    vehicleTypes: Array.isArray(raw.vehicleTypes) ? raw.vehicleTypes : [],
    patientOutcomes:
      Array.isArray(raw.patientOutcomes) && raw.patientOutcomes.length
        ? raw.patientOutcomes
        : base.patientOutcomes,
    transportTypes: Array.isArray(raw.transportTypes) ? raw.transportTypes : [],
  }
}

async function loadSetupFallback(): Promise<AdminReportFilterOptions> {
  const regionsRaw = await systemSetupService.getRegions()
  const regionsList = Array.isArray(regionsRaw) ? regionsRaw : []
  const regions = regionsList
    .filter((r: any) => r?.isActive !== false && !r?.deletedAt)
    .map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      districts: Array.isArray(r.districts)
        ? r.districts
            .filter((d: any) => d?.isActive !== false && !d?.deletedAt)
            .map((d: any) => ({
              id: String(d.id),
              name: String(d.name),
              regionId: String(d.regionId || r.id),
            }))
        : [],
    }))

  const districts = regions.flatMap((r) => r.districts ?? [])

  return normalizeFilterOptions({
    ...emptyOptions(),
    regions,
    districts,
  })
}

export async function getAdminReportFilterOptions(): Promise<AdminReportFilterOptions> {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/reports/admin/filter-options`, {
      headers: authHeaders(),
    })
    const normalized = normalizeFilterOptions(data)
    if (normalized.regions.length > 0) return normalized
  } catch {
    // fall through to setup API
  }

  try {
    return await loadSetupFallback()
  } catch {
    return emptyOptions()
  }
}

export async function getAdminReport(
  type: string,
  filters?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value?.trim()) params.set(key, value.trim())
    })
  }
  const query = params.toString()
  const { data } = await axios.get(
    `${API_BASE_URL}/api/reports/admin/${type}${query ? `?${query}` : ''}`,
    { headers: authHeaders() },
  )
  return data
}
