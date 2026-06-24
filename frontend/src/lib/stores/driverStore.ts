'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DriverMission {
  id: string
  trackingCode: string
  status: string
  priority: string
  pickupLocation: string
  pickupLandmark?: string
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  destination?: string
  patientCondition?: string
  notes?: string
  assignedAt?: string
  dispatchedAt?: string
  arrivedAtSceneAt?: string
  departedSceneAt?: string
  arrivedDestinationAt?: string
  completedAt?: string
  patient?: {
    fullName: string
    phone: string
    age?: number
    gender?: string
  }
  ambulance?: {
    ambulanceNumber: string
    vehicleType?: string
    plateNumber?: string
  }
  incidentCategory?: { name: string }
  region?: { name: string }
  district?: { name: string }
  dispatcher?: { user?: { username: string } }
  nurse?: { firstName?: string; lastName?: string }
  callerName?: string
  statusLogs?: Array<{ toStatus: string; createdAt: string; notes?: string }>
}

export interface DriverProfile {
  id: string
  firstName?: string
  lastName?: string
  phone?: string
  employeeCode?: string
  shiftStatus: string
  status: string
  licenseNumber?: string
  licenseClass?: string
  licenseExpiryDate?: string
  nationalId?: string
  defaultShift?: string
  profilePhoto?: string
  emergencyContactName?: string
  emergencyPhone?: string
  stationId?: string
  station?: { name: string; address?: string }
  assignedAmbulance?: {
    id: string
    ambulanceNumber: string
    vehicleType?: string
    plateNumber?: string
    status: string
    fuelLevel?: number
  }
  user?: { username: string; email: string }
}

export interface DashboardStats {
  totalMissions: number
  completedMissions: number
  cancelledMissions: number
  activeMissions: number
  completionRate: number
  avgResponseMinutes: number
  shiftStatus: string
}

interface OfflineUpdate {
  id: string
  type: 'mission_status'
  payload: any
  timestamp: number
}

interface DriverStore {
  // Auth
  token: string | null
  userId: string | null
  isAuthenticated: boolean

  // Profile
  profile: DriverProfile | null

  // Active mission
  activeMission: DriverMission | null

  // Stats
  stats: DashboardStats | null

  // Notifications
  unreadCount: number

  // Connection
  isOnline: boolean
  isSocketConnected: boolean

  // Offline queue
  offlineQueue: OfflineUpdate[]

  // Actions
  setAuth: (token: string, userId: string) => void
  clearAuth: () => void
  setProfile: (profile: DriverProfile) => void
  setActiveMission: (mission: DriverMission | null) => void
  setStats: (stats: DashboardStats) => void
  setUnreadCount: (count: number) => void
  setOnline: (online: boolean) => void
  setSocketConnected: (connected: boolean) => void
  addOfflineUpdate: (update: Omit<OfflineUpdate, 'id' | 'timestamp'>) => void
  removeOfflineUpdate: (id: string) => void
  clearOfflineQueue: () => void
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      isAuthenticated: false,
      profile: null,
      activeMission: null,
      stats: null,
      unreadCount: 0,
      isOnline: true,
      isSocketConnected: false,
      offlineQueue: [],

      setAuth: (token, userId) => set({ token, userId, isAuthenticated: true }),
      clearAuth: () =>
        set({
          token: null,
          userId: null,
          isAuthenticated: false,
          profile: null,
          activeMission: null,
          stats: null,
          offlineQueue: [],
        }),
      setProfile: (profile) => set({ profile }),
      setActiveMission: (activeMission) => set({ activeMission }),
      setStats: (stats) => set({ stats }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      setOnline: (isOnline) => set({ isOnline }),
      setSocketConnected: (isSocketConnected) => set({ isSocketConnected }),
      addOfflineUpdate: (update) =>
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            { ...update, id: `${Date.now()}`, timestamp: Date.now() },
          ],
        })),
      removeOfflineUpdate: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((u) => u.id !== id),
        })),
      clearOfflineQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: 'driver-store',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
        profile: state.profile,
        activeMission: state.activeMission,
        offlineQueue: state.offlineQueue,
        unreadCount: state.unreadCount,
      }),
    },
  ),
)
