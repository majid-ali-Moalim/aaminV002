import axios from 'axios'
import { API_BASE_URL } from '@/lib/api'

export type AdminReportFilterOptions = {
  regions: Array<{ id: string; name: string }>
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
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getAdminReportFilterOptions(): Promise<AdminReportFilterOptions> {
  const { data } = await axios.get<AdminReportFilterOptions>(
    `${API_BASE_URL}/api/reports/admin/filter-options`,
    { headers: authHeaders() },
  )
  return data
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
