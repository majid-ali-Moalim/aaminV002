import axios, { AxiosInstance } from 'axios'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '') + '/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined') return token
  } catch (_) {}
  return null
}

function createApi(): AxiosInstance {
  const api = axios.create({ baseURL: API_BASE })
  api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  return api
}

export const stationsApi = {
  getDashboard: async () => {
    const res = await createApi().get('/stations/dashboard')
    return res.data
  },
  getAll: async () => {
    const res = await createApi().get('/stations')
    return res.data
  },
  getById: async (id: string) => {
    const res = await createApi().get(`/stations/${id}`)
    return res.data
  },
  getCoverageMap: async () => {
    const res = await createApi().get('/stations/coverage-map')
    return res.data
  },
  getTransfers: async (params?: {
    limit?: number
    stationId?: string
    fromStationId?: string
    toStationId?: string
    startDate?: string
    endDate?: string
    reason?: string
    search?: string
    priority?: string
    caseStatus?: string
  }) => {
    const res = await createApi().get('/stations/transfers', { params: params ?? {} })
    return res.data
  },
  getAmbulances: async (stationId?: string) => {
    const res = await createApi().get('/stations/ambulances', {
      params: stationId ? { stationId } : {},
    })
    return res.data
  },
  getStaff: async (stationId?: string, role?: string) => {
    const res = await createApi().get('/stations/staff', {
      params: { ...(stationId ? { stationId } : {}), ...(role ? { role } : {}) },
    })
    return res.data
  },
  getCases: async (params?: { stationId?: string; status?: string; priority?: string }) => {
    const res = await createApi().get('/stations/cases', { params: params ?? {} })
    return res.data
  },
  getPerformance: async (stationId?: string) => {
    const res = await createApi().get('/stations/performance', {
      params: stationId ? { stationId } : {},
    })
    return res.data
  },
  getFullReports: async () => {
    const res = await createApi().get('/stations/reports')
    return res.data
  },
  suggestTransfer: async (fromStationId: string, districtId?: string) => {
    const res = await createApi().get(`/stations/suggest-transfer/${fromStationId}`, {
      params: districtId ? { districtId } : {},
    })
    return res.data
  },
}

export const STATION_TRANSFER_REASONS = [
  'No Ambulance Available',
  'No Driver Available',
  'No Nurse Available',
  'All Crews Busy',
  'Station Temporarily Closed',
  'Vehicle Breakdown',
  'Major Incident',
  'Traffic Conditions',
  'Other',
] as const
