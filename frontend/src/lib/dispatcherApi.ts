import axios, { AxiosInstance } from 'axios'

const API_BASE = 'http://localhost:3001/api'

function getDispatcherToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined') return token
  } catch (_) {}
  return null
}

function createDispatcherApi(): AxiosInstance {
  const api = axios.create({ baseURL: API_BASE })
  api.interceptors.request.use((config) => {
    const token = getDispatcherToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  api.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.replace('/dispatcher/login')
      }
      return Promise.reject(error)
    },
  )
  return api
}

export const dispatcherAuthApi = {
  login: async (username: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
    return res.data
  },
}

export const dispatcherProfileApi = {
  get: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/profile')
    return res.data
  },
  update: async (data: Record<string, unknown>) => {
    const res = await createDispatcherApi().patch('/dispatcher-app/profile', data)
    return res.data
  },
}

export const dispatcherDashboardApi = {
  getStats: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/dashboard')
    return res.data
  },
  getOverview: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/dashboard/overview')
    return res.data
  },
  getShift: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/shift')
    return res.data
  },
  startShift: async () => {
    const res = await createDispatcherApi().post('/dispatcher-app/shift/start')
    return res.data
  },
  endShift: async () => {
    const res = await createDispatcherApi().post('/dispatcher-app/shift/end')
    return res.data
  },
  setAvailability: async (available: boolean) => {
    const res = await createDispatcherApi().patch('/dispatcher-app/availability', { available })
    return res.data
  },
  getPendingQueue: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/queue/pending')
    return res.data
  },
  getActiveMissions: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/missions/active')
    return res.data
  },
  getMyCases: async (status?: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/cases', { params: { status } })
    return res.data
  },
  getFleet: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/fleet')
    return res.data
  },
  getStaff: async () => {
    const res = await createDispatcherApi().get('/dispatcher-app/staff')
    return res.data
  },
  getEmergencies: async (view: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/emergencies', { params: { view } })
    return res.data
  },
  getAmbulances: async (view: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/ambulances', { params: { view } })
    return res.data
  },
  getCrew: async (view: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/crew', { params: { view } })
    return res.data
  },
  getHospitals: async (view: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/hospitals', { params: { view } })
    return res.data
  },
  getAlertsFeed: async (view: string) => {
    const res = await createDispatcherApi().get('/dispatcher-app/alerts/feed', { params: { view } })
    return res.data
  },
}
