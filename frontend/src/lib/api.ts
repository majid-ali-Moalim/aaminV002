import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios'
import { AmbulanceStatus, Role, EmergencyRequestStatus, Priority, ReferralStatus, Ambulance, Employee } from '@/types'
import { normalizeUnifiedDashboard } from '@/lib/dashboard/unifiedDashboard'

/** Prefer env; fallback to 127.0.0.1 (avoids Windows localhost / IPv6 issues). */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

export function isApiNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string' && data.message) return data.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isApiNetworkError(error)) {
          error.message =
            'Cannot reach the API server. Make sure the backend is running (npm run start:dev in backend on port 3001).'
        }
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          if (typeof window !== 'undefined') {
            window.location.replace('/login')
          }
        }
        if (error.response?.status === 429) {
          error.message =
            'Too many requests — please wait a moment before refreshing.'
        }
        return Promise.reject(error)
      }
    )
  }

  // Generic request methods
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.api.patch(url, data, config)
    return response.data
  }

  async upload<T = any>(url: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    const response: AxiosResponse<T> = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

// Auth service
export const authService = {
  login: async (email: string, password: string) => {
    const api = new ApiService()
    const identifier = email.trim()
    return await api.post('/api/auth/login', {
      email: identifier,
      username: identifier,
      password,
    })
  },

  getMe: async (token?: string) => {
    const api = new ApiService()
    return await api.get('/api/auth/me')
  },

  updateMe: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch('/api/auth/me', data)
  },

  forgotPassword: async (email: string) => {
    const api = new ApiService()
    const normalizedEmail = email.trim().toLowerCase()
    return await api.post('/api/auth/forgot-password', { email: normalizedEmail })
  },

  resetPassword: async (email: string, password: string, confirmPassword: string) => {
    const api = new ApiService()
    return await api.post('/api/auth/reset-password', {
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
    })
  },

  verifyResetOtp: async (email: string, otp: string) => {
    const api = new ApiService()
    return await api.post('/api/auth/verify-reset-otp', {
      email: email.trim().toLowerCase(),
      otp: otp.replace(/\D/g, '').slice(0, 6),
    })
  },

  changePassword: async (data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    const api = new ApiService()
    return await api.post('/api/auth/change-password', data)
  },

  getSecurityActivity: async () => {
    const api = new ApiService()
    return await api.get('/api/auth/security-activity')
  },
}

// Users service
export const usersService = {
  getAll: async () => {
    const api = new ApiService()
    return await api.get('/api/users')
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/users/${id}`)
  },

  create: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/users', data)
  },

  update: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.put(`/api/users/${id}`, data)
  },

  delete: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/users/${id}`)
  }
}

// Ambulances service
export const ambulancesService = {
  getAll: async (): Promise<Ambulance[]> => {
    const api = new ApiService()
    return await api.get<Ambulance[]>('/api/ambulances')
  },

  getById: async (id: string): Promise<Ambulance> => {
    const api = new ApiService()
    return await api.get<Ambulance>(`/api/ambulances/${id}`)
  },

  create: async (data: any): Promise<Ambulance> => {
    const api = new ApiService()
    return await api.post<Ambulance>('/api/ambulances', data)
  },

  update: async (id: string, data: any): Promise<Ambulance> => {
    const api = new ApiService()
    return await api.patch<Ambulance>(`/api/ambulances/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    const api = new ApiService()
    return await api.delete(`/api/ambulances/${id}`)
  },

  updateStatus: async (id: string, status: string): Promise<Ambulance> => {
    const api = new ApiService()
    return await api.patch<Ambulance>(`/api/ambulances/${id}/status`, { status })
  },

  getByStatus: async (status: string): Promise<Ambulance[]> => {
    const api = new ApiService()
    return await api.get<Ambulance[]>(`/api/ambulances/status/${status}`)
  },

  assignDriver: async (id: string, driverEmployeeId: string): Promise<Ambulance> => {
    const api = new ApiService()
    return await api.patch<Ambulance>(`/api/ambulances/${id}/assign-driver`, { driverEmployeeId })
  },

  assignNurse: async (id: string, nurseEmployeeId: string) => {
    const api = new ApiService()
    return await api.patch(`/api/ambulances/${id}/assign-nurse`, { nurseEmployeeId })
  },

  getAvailabilityOverview: async () => {
    const api = new ApiService()
    return await api.get<import('@/lib/ambulance/availability').AmbulanceAvailabilityOverview>(
      '/api/ambulances/availability/overview',
    )
  },

  getAvailabilityDetail: async (id: string) => {
    const api = new ApiService()
    return await api.get<any>(`/api/ambulances/availability/${id}/detail`)
  },
}

// Employees service
export const employeesService = {
  getAll: async (roleId?: string, departmentId?: string): Promise<Employee[]> => {
    const api = new ApiService()
    let url = '/api/employees'
    if (roleId || departmentId) {
      const params = new URLSearchParams()
      if (roleId) params.append('employeeRoleId', roleId)
      if (departmentId) params.append('departmentId', departmentId)
      url += `?${params.toString()}`
    }
    return await api.get<Employee[]>(url)
  },

  getById: async (id: string): Promise<Employee> => {
    const api = new ApiService()
    return await api.get<Employee>(`/api/employees/${id}`)
  },

  create: async (data: any): Promise<Employee> => {
    const api = new ApiService()
    return await api.post<Employee>('/api/employees', data)
  },

  update: async (id: string, data: any): Promise<Employee> => {
    const api = new ApiService()
    return await api.patch<Employee>(`/api/employees/${id}`, data)
  },

  delete: async (id: string): Promise<void> => {
    const api = new ApiService()
    return await api.delete(`/api/employees/${id}`)
  }
}

// Patients service
export const patientsService = {
  getAll: async () => {
    const api = new ApiService()
    return await api.get('/api/patients')
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/patients/${id}`)
  },

  create: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/patients', data)
  },

  update: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.put(`/api/patients/${id}`, data)
  },

  delete: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/patients/${id}`)
  }
}

// Emergency requests service
export const emergencyRequestsService = {
  getAll: async () => {
    const api = new ApiService()
    return await api.get('/api/emergency-requests')
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/emergency-requests/${id}`)
  },

  create: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/emergency-requests', data)
  },

  update: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}`, data)
  },

  delete: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/emergency-requests/${id}`)
  },

  assignAmbulance: async (id: string, ambulanceId: string, driverId: string, nurseId?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}/assign`, { ambulanceId, driverId, nurseId })
  },

  updateStatus: async (id: string, status: string) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}/status`, { status })
  },

  getByTrackingCode: async (code: string) => {
    const api = new ApiService()
    return await api.get(`/api/emergency-requests/track/${code}`)
  },

  getAvailableAmbulances: async () => {
    const api = new ApiService()
    return await api.get('/api/emergency-requests/available/ambulances')
  },

  getAvailableDrivers: async () => {
    const api = new ApiService()
    return await api.get('/api/emergency-requests/available/drivers')
  },
 
  getAvailableNurses: async () => {
    const api = new ApiService()
    return await api.get('/api/emergency-requests/available/nurses')
  },

  cancelRequest: async (id: string, reason: string) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}/cancel`, { reason })
  },

  escalateRequest: async (id: string, reason?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}/escalate`, { reason })
  },

  markFailed: async (id: string, reason: string) => {
    const api = new ApiService()
    return await api.patch(`/api/emergency-requests/${id}/fail`, { reason })
  },

  getTimeline: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/emergency-requests/${id}/timeline`)
  },

  getByStatus: async (status: string) => {
    const api = new ApiService()
    return await api.get(`/api/emergency-requests?status=${status}`)
  },
}

// Referrals service
export const referralsService = {
  getAll: async () => {
    const api = new ApiService()
    return await api.get('/api/referrals')
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/referrals/${id}`)
  },

  create: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/referrals', data)
  },

  update: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.put(`/api/referrals/${id}`, data)
  },

  delete: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/referrals/${id}`)
  }
}

// Reports service
export const reportsService = {
  getDashboardStats: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/dashboard')
  },

  getEmergencyRequests: async (filters?: any) => {
    const api = new ApiService()
    return await api.post('/api/reports/emergency-requests', filters)
  },

  getAmbulancePerformance: async (filters?: any) => {
    const api = new ApiService()
    return await api.post('/api/reports/ambulance-performance', filters)
  },

  getStaffPerformance: async (filters?: any) => {
    const api = new ApiService()
    return await api.post('/api/reports/staff-performance', filters)
  },

  // Enhanced dashboard API methods
  getEmergencyKPIs: async (timeRange?: string) => {
    const api = new ApiService()
    const params = timeRange ? `?timeRange=${timeRange}` : ''
    return await api.get(`/api/reports/kpi/emergency${params}`)
  },

  getPerformanceMetrics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/kpi/performance')
  },

  getResourceUtilization: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/kpi/resources')
  },

  getPatientAnalytics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/kpi/patients')
  },

  getGeographicAnalytics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/kpi/geographic')
  },

  getWeeklyTrends: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/trends/weekly')
  },

  getMonthlyTrends: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/trends/monthly')
  },

  getSuccessRateAnalytics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/analytics/success-rate')
  },

  getResponseTimeAnalytics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/analytics/response-time')
  },

  getFleetUtilization: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/fleet/utilization')
  },

  getStaffProductivity: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/staff/productivity')
  },

  getIncidentHeatmap: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/geographic/heatmap')
  },

  getRealTimeMetrics: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/realtime/metrics')
  },

  getDispatchReadiness: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/dispatch-readiness')
  },

  getUnifiedDashboard: async () => {
    const api = new ApiService()
    const raw = await api.get('/api/reports/dashboard/unified')
    return normalizeUnifiedDashboard(raw)
  },

  getSystemHealth: async () => {
    const api = new ApiService()
    return await api.get('/api/reports/system/health')
  },

  getAdminReport: async (type: string, filters?: Record<string, string | undefined>) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim())
      })
    }
    const query = params.toString()
    return await api.get(`/api/reports/admin/${type}${query ? `?${query}` : ''}`)
  },

  getAdminReportFilterOptions: async () => {
    const api = new ApiService()
    return await api.get<{
      regions: Array<{ id: string; name: string }>
      districts: Array<{ id: string; name: string; regionId: string }>
      incidentCategories: Array<{ id: string; name: string }>
      ambulances: Array<{ id: string; ambulanceNumber: string; plateNumber: string; vehicleType: string | null; status: string }>
      hospitals: Array<{ id: string; name: string; status: string }>
      employeeRoles: Array<{ id: string; name: string }>
      priorities: Array<{ value: string; label: string }>
      emergencyStatuses: Array<{ value: string; label: string }>
      ambulanceStatuses: Array<{ value: string; label: string }>
      vehicleTypes: Array<{ value: string; label: string }>
    }>('/api/reports/admin/filter-options')
  },
}

export const publicService = {
  getStats: async () => {
    const api = new ApiService()
    return await api.get('/api/public/stats')
  },
}

// System Setup Service
export const systemSetupService = {
  getRegions: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/regions')
  },
  getDistricts: async (regionId?: string) => {
    const api = new ApiService()
    const url = regionId ? `/api/setup/districts?regionId=${regionId}` : '/api/setup/districts'
    return await api.get(url)
  },
  getDepartments: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/departments')
  },
  getRoles: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/roles')
  },
  getEquipmentLevels: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/equipment-levels')
  },
  getIncidentCategories: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/incident-categories')
  },
  getEmergencyTypes: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/emergency-types')
  },
  getStations: async (districtId?: string) => {
    const api = new ApiService()
    const url = districtId ? `/api/setup/stations?districtId=${districtId}` : '/api/setup/stations'
    return await api.get(url)
  },
  getAreas: async (districtId?: string) => {
    const api = new ApiService()
    const url = districtId ? `/api/setup/areas?districtId=${districtId}` : '/api/setup/areas'
    return await api.get(url)
  },
  getCoverage: async () => {
    const api = new ApiService()
    return await api.get('/api/setup/coverage')
  },
  getHospitals: async (districtId?: string) => {
    const api = new ApiService()
    const url = districtId ? `/api/setup/hospitals?districtId=${districtId}` : '/api/setup/hospitals'
    return await api.get(url)
  },

  // --- Region CRUD ---
  createRegion: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/setup/region', data)
  },
  updateRegion: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/setup/region/${id}`, data)
  },
  deleteRegion: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/setup/region/${id}`)
  },

  // --- District CRUD ---
  createDistrict: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/setup/district', data)
  },
  updateDistrict: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/setup/district/${id}`, data)
  },
  deleteDistrict: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/setup/district/${id}`)
  },

  // --- Station CRUD ---
  createStation: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/setup/station', data)
  },
  updateStation: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/setup/station/${id}`, data)
  },
  deleteStation: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/setup/station/${id}`)
  },

  // --- Area CRUD ---
  createArea: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/setup/area', data)
  },
  updateArea: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/setup/area/${id}`, data)
  },
  deleteArea: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/setup/area/${id}`)
  },

  // --- Generic Fallback ---
  create: async (model: string, data: any) => {
    const api = new ApiService()
    return await api.post(`/api/setup/${model}`, data)
  },
  update: async (model: string, id: string, data: any) => {
    const api = new ApiService()
    return await api.patch(`/api/setup/${model}/${id}`, data)
  },
  delete: async (model: string, id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/setup/${model}/${id}`)
  }
}

// Drivers service
export const driversService = {
  getAll: async (filters?: { stationId?: string; status?: string; shiftStatus?: string; searchTerm?: string }) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (filters?.stationId) params.append('stationId', filters.stationId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.shiftStatus) params.append('shiftStatus', filters.shiftStatus)
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm)
    
    return await api.get(`/api/drivers?${params.toString()}`)
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/drivers/${id}`)
  },

  getStats: async () => {
    const api = new ApiService()
    return await api.get('/api/drivers/stats')
  },

  getPerformance: async () => {
    const api = new ApiService()
    return await api.get('/api/drivers/performance')
  },

  getAttendance: async (startDate?: string, endDate?: string) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return await api.get(`/api/drivers/attendance?${params.toString()}`)
  },

  updateShift: async (id: string, status: string, notes?: string) => {
    const api = new ApiService()
    return await api.post(`/api/drivers/${id}/shift`, { status, notes })
  },

  assignAmbulance: async (id: string, ambulanceId: string | null) => {
    const api = new ApiService()
    return await api.put(`/api/drivers/${id}/ambulance`, { ambulanceId })
  },

  getAvailabilityOverview: async () => {
    const api = new ApiService()
    return await api.get<import('@/lib/drivers/availability').DriverAvailabilityOverview>(
      '/api/drivers/availability/overview',
    )
  },

  getAvailabilityDetail: async (id: string) => {
    const api = new ApiService()
    return await api.get<any>(`/api/drivers/availability/${id}/detail`)
  },
}

// Dispatchers service
export const dispatchersService = {
  getAll: async (filters?: { stationId?: string; status?: string; shiftStatus?: string; searchTerm?: string }) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (filters?.stationId) params.append('stationId', filters.stationId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.shiftStatus) params.append('shiftStatus', filters.shiftStatus)
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm)
    const qs = params.toString()
    return await api.get(`/api/dispatchers${qs ? `?${qs}` : ''}`)
  },

  getStats: async () => {
    const api = new ApiService()
    return await api.get('/api/dispatchers/stats')
  },
}

// Nurses service
export const nursesService = {
  getAll: async (filters?: { stationId?: string; status?: string; shiftStatus?: string; searchTerm?: string }) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (filters?.stationId) params.append('stationId', filters.stationId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.shiftStatus) params.append('shiftStatus', filters.shiftStatus)
    if (filters?.searchTerm) params.append('searchTerm', filters.searchTerm)
    
    return await api.get(`/api/nurses?${params.toString()}`)
  },

  getById: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/nurses/${id}`)
  },

  getStats: async () => {
    const api = new ApiService()
    return await api.get('/api/nurses/stats')
  },

  getAssignments: async () => {
    const api = new ApiService()
    return await api.get('/api/nurses/assignments')
  },

  getMyCases: async (nurseId: string, status?: string) => {
    const api = new ApiService()
    const params = new URLSearchParams({ nurseId })
    if (status) params.append('status', status)
    return await api.get(`/api/nurses/me/cases?${params.toString()}`)
  },

  getPerformance: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/nurses/${id}/performance`)
  },

  getPatientCareRecords: async (nurseId?: string) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (nurseId) params.append('nurseId', nurseId)
    return await api.get(`/api/nurses/reports/patient-care?${params.toString()}`)
  },

  getIncidentReports: async (nurseId?: string) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (nurseId) params.append('nurseId', nurseId)
    return await api.get(`/api/nurses/reports/incidents?${params.toString()}`)
  },
 
  createPatientCareRecord: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/nurses/records', data)
  },

  acceptMission: async (requestId: string, nurseId: string) => {
    const api = new ApiService()
    return await api.post(`/api/nurses/missions/${requestId}/accept`, { nurseId })
  },
 
  createIncidentReport: async (data: any) => {
    const api = new ApiService()
    return await api.post('/api/nurses/incidents', data)
  },

  updateShift: async (id: string, status: string, notes?: string) => {
    const api = new ApiService()
    return await api.post(`/api/nurses/${id}/shift`, { status, notes })
  },

  updateClearance: async (id: string, status: string) => {
    const api = new ApiService()
    return await api.patch(`/api/nurses/${id}/clearance`, { status })
  },

  assignAmbulance: async (id: string, ambulanceId: string | null) => {
    const api = new ApiService()
    return await api.put(`/api/nurses/${id}/ambulance`, { ambulanceId })
  },

  getAvailabilityOverview: async () => {
    const api = new ApiService()
    return await api.get<import('@/lib/nurses/availability').NurseAvailabilityOverview>(
      '/api/nurses/availability/overview',
    )
  },

  getAvailabilityDetail: async (id: string) => {
    const api = new ApiService()
    return await api.get<any>(`/api/nurses/availability/${id}/detail`)
  },
}

// Notifications service
export const notificationsService = {
  getInbox: async (filters?: Record<string, string | number | boolean | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/notifications/inbox', { params: filters })
  },
  getAll: async (filters?: Record<string, string | number | boolean | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/notifications', { params: filters })
  },
  getStats: async () => {
    const api = new ApiService()
    return await api.get('/api/notifications/stats')
  },
  getRecent: async () => {
    const api = new ApiService()
    return await api.get('/api/notifications/recent')
  },
  markRead: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/notifications/${id}/read`)
  },
  markUnread: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/notifications/${id}/unread`)
  },
  markAllRead: async () => {
    const api = new ApiService()
    return await api.post('/api/notifications/mark-all-read')
  },
  archive: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/notifications/${id}/archive`)
  },
  resolve: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/notifications/${id}/resolve`)
  },
  remove: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/notifications/${id}`)
  },
  getPreferences: async () => {
    const api = new ApiService()
    return await api.get('/api/notifications/preferences')
  },
  updatePreferences: async (preferences: { category: string; channel: string; enabled: boolean }[]) => {
    const api = new ApiService()
    return await api.patch('/api/notifications/preferences', { preferences })
  },
  sendTestEmail: async () => {
    const api = new ApiService()
    return await api.post<{ success: boolean; email?: string; message: string }>(
      '/api/notifications/preferences/test-email',
    )
  },
  getAlerts: async (filters?: { status?: string; priority?: string }) => {
    const api = new ApiService()
    return await api.get('/api/notifications/alerts', { params: filters })
  },
  createAlert: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.post('/api/notifications/alerts', data)
  },
  resolveAlert: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/notifications/alerts/${id}/resolve`)
  },
  getDeliveryLogs: async (notificationId?: string) => {
    const api = new ApiService()
    return await api.get('/api/notifications/delivery-logs', {
      params: notificationId ? { notificationId } : undefined,
    })
  },
  broadcast: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.post('/api/notifications/broadcast', data)
  },
}

export const mdmService = {
  list: async (entity: string, params?: Record<string, string | number | boolean>) => {
    const api = new ApiService()
    return await api.get(`/api/master-data/${entity}`, { params })
  },
  listAll: async (entity: string, params?: Record<string, string>) => {
    const api = new ApiService()
    return await api.get(`/api/master-data/${entity}/all`, { params })
  },
  getOne: async (entity: string, id: string) => {
    const api = new ApiService()
    return await api.get(`/api/master-data/${entity}/${id}`)
  },
  create: async (entity: string, data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.post(`/api/master-data/${entity}`, data)
  },
  update: async (entity: string, id: string, data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch(`/api/master-data/${entity}/${id}`, data)
  },
  activate: async (entity: string, id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/master-data/${entity}/${id}/activate`)
  },
  deactivate: async (entity: string, id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/master-data/${entity}/${id}/deactivate`)
  },
  remove: async (entity: string, id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/master-data/${entity}/${id}`)
  },
  getAuditLogs: async (entity: string) => {
    const api = new ApiService()
    return await api.get(`/api/master-data/${entity}/audit/logs`)
  },
  getSettingsSection: async (section: string) => {
    const api = new ApiService()
    return await api.get(`/api/master-data/settings/section/${section}`)
  },
  updateSettingsSection: async (
    section: string,
    settings: { key: string; value: unknown; description?: string }[],
  ) => {
    const api = new ApiService()
    return await api.patch(`/api/master-data/settings/section/${section}`, { settings })
  },
}

// Access control service
export const accessControlService = {
  getCatalog: async () => {
    const api = new ApiService()
    return await api.get('/api/access-control/catalog')
  },
  getMyPermissions: async () => {
    const api = new ApiService()
    return await api.get<{
      activePermissionKeys?: string[]
      baselinePermissions?: string[]
      activeGrantedKeys?: string[]
      grantablePermissionKeys?: string[]
      grantedPermissions: Array<{
        permissionKey: string
        grantedAt: string
        expiresAt: string | null
        isUnlimited: boolean
        isExpired: boolean
      }>
    }>('/api/access-control/me/permissions')
  },
  getUserPermissions: async (userId: string) => {
    const api = new ApiService()
    return await api.get<{
      userId: string
      role: string
      employeeRole: string | null
      staffProfile: string | null
      canAssignPermissions: boolean
      baselinePermissions?: string[]
      suggestedPermissions: string[]
      grantedPermissions: Array<{
        permissionKey: string
        grantedAt: string
        expiresAt: string | null
        isUnlimited: boolean
        isExpired: boolean
      }>
      activePermissionKeys?: string[]
      activeGrantedKeys?: string[]
      grantablePermissionKeys?: string[]
    }>(`/api/access-control/users/${userId}/permissions`)
  },
  setUserPermissions: async (
    userId: string,
    payload: { permissions: string[]; expiresAt?: string | null },
  ) => {
    const api = new ApiService()
    return await api.put(`/api/access-control/users/${userId}/permissions`, payload)
  },
  listAllGrants: async (params?: {
    search?: string
    duration?: 'all' | 'permanent' | 'temporary'
    status?: 'all' | 'active' | 'inactive' | 'expired'
  }) => {
    const api = new ApiService()
    const search = new URLSearchParams()
    if (params?.search) search.append('search', params.search)
    if (params?.duration && params.duration !== 'all') search.append('duration', params.duration)
    if (params?.status && params.status !== 'all') search.append('status', params.status)
    const qs = search.toString() ? `?${search.toString()}` : ''
    return await api.get<
      Array<{
        id: string
        permissionKey: string
        grantedAt: string
        expiresAt: string | null
        isUnlimited: boolean
        isActive: boolean
        isTimeExpired: boolean
        isExpired: boolean
        isEffective: boolean
        status: 'active' | 'inactive' | 'expired'
        user: {
          id: string
          username: string
          email: string
          role: string
          displayName: string
          employeeRole: string | null
          department: string | null
        }
      }>
    >(`/api/access-control/grants${qs}`)
  },
  activateGrant: async (grantId: string) => {
    const api = new ApiService()
    return await api.patch(`/api/access-control/grants/${grantId}/activate`, {})
  },
  deactivateGrant: async (grantId: string) => {
    const api = new ApiService()
    return await api.patch(`/api/access-control/grants/${grantId}/deactivate`, {})
  },
  deleteGrant: async (grantId: string) => {
    const api = new ApiService()
    return await api.delete(`/api/access-control/grants/${grantId}`)
  },
}

// Activity logs service
export const activityLogsService = {
  getAll: async (params?: { limit?: number; entityType?: string; userId?: string; since?: string }) => {
    const api = new ApiService()
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.entityType) search.append('entityType', params.entityType)
    if (params?.userId) search.append('userId', params.userId)
    if (params?.since) search.append('since', params.since)
    const qs = search.toString() ? `?${search.toString()}` : ''
    return await api.get<any[]>(`/api/activity-logs${qs}`)
  },
  getOperational: async (params?: { limit?: number; category?: string; search?: string }) => {
    const api = new ApiService()
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.category) search.append('category', params.category)
    if (params?.search) search.append('search', params.search)
    const qs = search.toString() ? `?${search.toString()}` : ''
    return await api.get<import('@/lib/dashboard/operationalActivities').OperationalActivityFeed>(
      `/api/activity-logs/operational${qs}`,
    )
  },
}

// Upload service
export const uploadService = {
  uploadFile: async (file: File) => {
    const api = new ApiService()
    return await api.upload('/api/uploads', file)
  },
}

export const employeeAttendanceService = {
  getOverview: async () => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/overview')
  },
  getRecords: async (params?: Record<string, string | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/records', { params })
  },
  getToday: async () => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/today')
  },
  getByDay: async (date: string) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/day', { params: { date } })
  },
  getShifts: async () => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/shifts')
  },
  getApprovals: async (status?: string) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/approvals', { params: { status } })
  },
  reviewApproval: async (id: string, action: 'approve' | 'reject', reviewerComment?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/employee-attendance/approvals/${id}`, { action, reviewerComment })
  },
  getLeave: async (status?: string) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/leave', { params: { status } })
  },
  reviewLeave: async (id: string, action: 'approve' | 'reject', reviewerComment?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/employee-attendance/leave/${id}`, { action, reviewerComment })
  },
  getOvertime: async (status?: string) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/overtime', { params: { status } })
  },
  reviewOvertime: async (id: string, action: 'approve' | 'reject') => {
    const api = new ApiService()
    return await api.patch(`/api/employee-attendance/overtime/${id}`, { action })
  },
  getAnalytics: async (params?: { startDate?: string; endDate?: string }) => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/analytics', { params })
  },
  getRoleMonitoring: async (roleKey: string) => {
    const api = new ApiService()
    return await api.get(`/api/employee-attendance/roles/${roleKey}`)
  },
  updateRecord: async (id: string, data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch(`/api/employee-attendance/records/${id}`, data)
  },
  exportReport: async (body: { type: string; startDate?: string; endDate?: string }) => {
    const api = new ApiService()
    return await api.post('/api/employee-attendance/export', body)
  },
  listWorkShifts: async () => {
    const api = new ApiService()
    return await api.get('/api/employee-attendance/work-shifts')
  },
  createWorkShift: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.post('/api/employee-attendance/work-shifts', data)
  },
  updateWorkShift: async (id: string, data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch(`/api/employee-attendance/work-shifts/${id}`, data)
  },
  deleteWorkShift: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/employee-attendance/work-shifts/${id}`)
  },
}

// Hospital coordination service
export const hospitalCoordinationService = {
  getOverview: async () => {
    const api = new ApiService()
    return await api.get('/api/hospital-coordination/overview')
  },
  listHospitals: async (params?: Record<string, string | boolean | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/hospital-coordination/hospitals', { params })
  },
  updateAvailability: async (id: string, data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/hospitals/${id}/availability`, data)
  },
  activateHospital: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/hospitals/${id}/activate`)
  },
  deactivateHospital: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/hospitals/${id}/deactivate`)
  },
  listCases: async (params?: Record<string, string | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/hospital-coordination/cases', { params })
  },
  acceptCase: async (id: string, receivingStaffName?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/accept`, { receivingStaffName })
  },
  rejectCase: async (id: string, reason: string, notes?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/reject`, { reason, notes })
  },
  moveToHandover: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/handover-queue`)
  },
  startHandover: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/handover/start`)
  },
  completeHandover: async (id: string, receivingStaffName?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/handover/complete`, { receivingStaffName })
  },
  updateCaseStatus: async (id: string, status: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-coordination/cases/${id}/status`, { status })
  },
  getAnalytics: async (params?: Record<string, string | undefined>) => {
    const api = new ApiService()
    return await api.get('/api/hospital-coordination/analytics', { params })
  },
}

// Hospitals service
export const hospitalsService = {
  getAll: async (filters?: { regionId?: string; districtId?: string }) => {
    const api = new ApiService()
    const params = new URLSearchParams()
    if (filters?.regionId) params.append('regionId', filters.regionId)
    if (filters?.districtId) params.append('districtId', filters.districtId)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return await api.get<any[]>(`/api/hospitals${queryString}`)
  },
  createHospital: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.post<any>('/api/hospitals/create', data)
  },
  create: async (data: any) => {
    const api = new ApiService()
    return await api.post<any>('/api/hospitals', data)
  },
  update: async (id: string, data: any) => {
    const api = new ApiService()
    return await api.patch<any>(`/api/hospitals/${id}`, data)
  },
  delete: async (id: string) => {
    const api = new ApiService()
    return await api.delete(`/api/hospitals/${id}`)
  }
}

// Hospital portal app service
export const hospitalAppApi = {
  getProfile: async () => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/profile')
  },
  getDashboard: async () => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/dashboard')
  },
  listCases: async (params?: { tab?: string; search?: string }) => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/cases', { params })
  },
  getCase: async (id: string) => {
    const api = new ApiService()
    return await api.get(`/api/hospital-app/cases/${id}`)
  },
  updatePreparation: async (id: string, preparation: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-app/cases/${id}/preparation`, preparation)
  },
  acceptCase: async (id: string, receivingStaffName?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-app/cases/${id}/accept`, { receivingStaffName })
  },
  rejectCase: async (id: string, reason: string, notes?: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-app/cases/${id}/reject`, { reason, notes })
  },
  getIncomingAmbulances: async () => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/ambulances/incoming')
  },
  getHandoverQueue: async () => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/handover/queue')
  },
  startHandover: async (id: string) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-app/handover/${id}/start`)
  },
  completeHandover: async (
    id: string,
    data: { receivingStaffName?: string; department?: string; notes?: string },
  ) => {
    const api = new ApiService()
    return await api.patch(`/api/hospital-app/handover/${id}/complete`, data)
  },
  updateCapacity: async (data: Record<string, unknown>) => {
    const api = new ApiService()
    return await api.patch('/api/hospital-app/capacity', data)
  },
  getReports: async (params?: { startDate?: string; endDate?: string }) => {
    const api = new ApiService()
    return await api.get('/api/hospital-app/reports', { params })
  },
}
