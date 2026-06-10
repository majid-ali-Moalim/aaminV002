/** Shared login redirect & role detection (matches backend RolesGuard). */

export type AuthUserLike = {
  role?: string
  employeeRole?: string | null
  employee?: {
    employeeRole?: { name?: string } | null
    status?: string
  } | null
}

export function getEmployeeRoleName(user: AuthUserLike): string {
  return String(
    user.employeeRole ?? user.employee?.employeeRole?.name ?? '',
  ).toUpperCase()
}

export function isAdminUser(user: AuthUserLike): boolean {
  return user.role === 'ADMIN'
}

export function isPatientUser(user: AuthUserLike): boolean {
  return user.role === 'PATIENT'
}

export function isDispatcherUser(user: AuthUserLike): boolean {
  if (!user?.role) return false
  if (user.role === 'DISPATCHER') return true
  if (user.role !== 'EMPLOYEE') return false
  return getEmployeeRoleName(user).includes('DISPATCH')
}

export function isDispatcherActive(user: AuthUserLike): boolean {
  if (!isDispatcherUser(user)) return false
  const status = String(user.employee?.status ?? 'ACTIVE').toUpperCase()
  return status === 'ACTIVE'
}

export function isDriverUser(user: AuthUserLike): boolean {
  if (!user?.role) return false
  if (user.role === 'DRIVER') return true
  if (user.role !== 'EMPLOYEE') return false
  return getEmployeeRoleName(user).includes('DRIVER')
}

export function isNurseUser(user: AuthUserLike): boolean {
  if (!user?.role) return false
  if (user.role === 'NURSE') return true
  if (user.role !== 'EMPLOYEE') return false
  const name = getEmployeeRoleName(user)
  return name.includes('NURSE') || name.includes('PARAMEDIC')
}

/** Portal role used for route access (ADMIN, DISPATCHER, DRIVER, NURSE, PATIENT, …). */
export function resolvePortalRole(user: AuthUserLike): string {
  const role = user.role ?? ''

  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'PATIENT') return 'PATIENT'
  if (role === 'DISPATCHER' || isDispatcherUser(user)) return 'DISPATCHER'
  if (role === 'DRIVER' || isDriverUser(user)) return 'DRIVER'
  if (role === 'NURSE' || isNurseUser(user)) return 'NURSE'
  if (role === 'MANAGER') return 'MANAGER'
  if (role === 'HOSPITAL') return 'HOSPITAL'

  return role
}

const PORTAL_DASHBOARDS: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  DISPATCHER: '/dispatcher/dashboard',
  DRIVER: '/driver',
  NURSE: '/nurse/dashboard',
  MANAGER: '/manager/dashboard',
  HOSPITAL: '/hospital/dashboard',
  PATIENT: '/patient/dashboard',
}

export function getPostLoginPath(user: AuthUserLike): string {
  const portal = resolvePortalRole(user)
  return PORTAL_DASHBOARDS[portal] ?? '/login'
}

export function getDashboardPathForPortalRole(portalRole: string): string | null {
  return PORTAL_DASHBOARDS[portalRole] ?? null
}

export function persistAuthToken(accessToken: string, maxAgeSeconds = 900) {
  if (typeof document === 'undefined') return
  document.cookie = `token=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

export function clearAuthTokenCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
}

/** Single sign-out entry: clears session and returns path to centralized login. */
export const CENTRAL_LOGIN_PATH = '/login'

export async function clearAllAuthSessions() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('refreshToken')
  }
  clearAuthTokenCookie()
  try {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().logout()
  } catch {
    /* optional */
  }
  try {
    const { useDriverStore } = await import('@/lib/stores/driverStore')
    const store = useDriverStore.getState() as { clearAuth?: () => void; logout?: () => void }
    store.clearAuth?.()
    store.logout?.()
  } catch {
    /* optional */
  }
}

export async function syncRoleStores(accessToken: string, userData: AuthUserLike & { id?: string }) {
  if (isDriverUser(userData) && userData.id) {
    try {
      const { useDriverStore } = await import('@/lib/stores/driverStore')
      useDriverStore.getState().setAuth(accessToken, userData.id)
    } catch {
      /* optional */
    }
  }
}
