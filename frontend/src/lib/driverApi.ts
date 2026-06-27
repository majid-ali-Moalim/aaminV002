import axios, { AxiosInstance } from 'axios'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '') + '/api'

function getDriverToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Read from unified AuthContext localStorage (main /login flow)
  try {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined') return token
  } catch (_) {}

  // 2. In-memory driverStore (old driver-specific login flow)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useDriverStore } = require('@/lib/stores/driverStore')
    const inMemory: string | null = useDriverStore.getState()?.token ?? null
    if (inMemory) return inMemory
  } catch (_) {}

  // 3. Persisted driverStore localStorage (after page refresh)
  try {
    const raw = localStorage.getItem('driver-store')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

function createDriverApi(): AxiosInstance {
  const api = axios.create({ baseURL: API_BASE })
  api.interceptors.request.use((config) => {
    const token = getDriverToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  api.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('driver-store')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.replace('/login')
      }
      return Promise.reject(error)
    },
  )
  return api
}

// ─── AUTH ──────────────────────────────────────────────────────────────────

export const driverAuthApi = {
  login: async (username: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
    return res.data
  },
}

// ─── PROFILE ───────────────────────────────────────────────────────────────

export const driverProfileApi = {
  get: async () => {
    const res = await createDriverApi().get('/driver-app/profile')
    return res.data
  },
  update: async (data: any) => {
    const res = await createDriverApi().patch('/driver-app/profile', data)
    return res.data
  },
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

export const driverDashboardApi = {
  getStats: async () => {
    const res = await createDriverApi().get('/driver-app/dashboard')
    return res.data
  },
}

// ─── SHIFT ─────────────────────────────────────────────────────────────────

export const driverShiftApi = {
  getStatus: async () => {
    const res = await createDriverApi().get('/driver-app/shift')
    return res.data
  },
  start: async () => {
    const res = await createDriverApi().post('/driver-app/shift/start')
    return res.data
  },
  end: async () => {
    const res = await createDriverApi().post('/driver-app/shift/end')
    return res.data
  },
  setAvailability: async (available: boolean) => {
    const res = await createDriverApi().patch('/driver-app/availability', { available })
    return res.data
  },
}

// ─── MISSIONS ──────────────────────────────────────────────────────────────

export const driverMissionsApi = {
  getActive: async () => {
    const res = await createDriverApi().get('/driver-app/missions/active')
    return res.data
  },
  getHistory: async (page = 1, limit = 20, status?: string) => {
    const params: any = { page, limit }
    if (status) params.status = status
    const res = await createDriverApi().get('/driver-app/missions/history', { params })
    return res.data
  },
  getById: async (id: string) => {
    const res = await createDriverApi().get(`/driver-app/missions/${id}`)
    return res.data
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const res = await createDriverApi().patch(`/driver-app/missions/${id}/status`, { status, notes })
    return res.data
  },
  reject: async (id: string, reason?: string) => {
    const res = await createDriverApi().post(`/driver-app/missions/${id}/reject`, { reason })
    return res.data
  },
}

// ─── AMBULANCE ─────────────────────────────────────────────────────────────

export const driverAmbulanceApi = {
  get: async () => {
    const res = await createDriverApi().get('/driver-app/ambulance')
    return res.data
  },
  updateStatus: async (status: string) => {
    const res = await createDriverApi().patch('/driver-app/ambulance/status', { status })
    return res.data
  },
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

export const driverNotificationsApi = {
  get: async (page = 1, limit = 20) => {
    const res = await createDriverApi().get('/driver-app/notifications', { params: { page, limit } })
    return res.data
  },
  markRead: async (id: string) => {
    const res = await createDriverApi().patch(`/driver-app/notifications/${id}/read`)
    return res.data
  },
  markAllRead: async () => {
    const res = await createDriverApi().post('/driver-app/notifications/mark-all-read')
    return res.data
  },
}
