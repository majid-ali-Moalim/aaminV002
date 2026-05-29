'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { dispatcherProfileApi, dispatcherDashboardApi } from '@/lib/dispatcherApi'

export type DispatcherPanel =
  | 'pending'
  | 'active'
  | 'fleet'
  | 'staff'
  | 'cases'
  | 'shift'
  | 'communications'

export function isDispatcherUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const u = user as Record<string, unknown>
  if (u.role === 'DISPATCHER') return true
  if (u.role !== 'EMPLOYEE') return false

  const employee = u.employee as Record<string, unknown> | undefined
  const roleObj = employee?.employeeRole as Record<string, unknown> | undefined
  const roleName = String(u.employeeRole ?? roleObj?.name ?? '').toUpperCase()
  return roleName.includes('DISPATCH')
}

export function isDispatcherActive(user: unknown): boolean {
  if (!isDispatcherUser(user)) return false
  const u = user as Record<string, unknown>
  const employee = u.employee as Record<string, unknown> | undefined
  const status = String(employee?.status ?? 'ACTIVE').toUpperCase()
  return status === 'ACTIVE'
}

export function useDispatcherAccess() {
  const { user, token, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const isAuthorized = !!token && isDispatcherUser(user) && isDispatcherActive(user)
  const shiftStatus = profile?.shiftStatus ?? stats?.shiftStatus ?? (user as any)?.employee?.shiftStatus ?? 'OFF_DUTY'
  const canOperate = isAuthorized && ['ON_DUTY', 'AVAILABLE'].includes(shiftStatus)
  const canAssign = canOperate
  const canViewHistory = isAuthorized

  const refresh = useCallback(async () => {
    if (!token || !isDispatcherUser(user)) {
      setLoading(false)
      return
    }
    try {
      const [p, s] = await Promise.all([
        dispatcherProfileApi.get(),
        dispatcherDashboardApi.getStats(),
      ])
      setProfile(p)
      setStats(s)
    } catch {
      // Profile fetch may fail if token expired — guard handles redirect
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  const canOpenPanel = (panel: DispatcherPanel): boolean => {
    if (!isAuthorized) return false
    switch (panel) {
      case 'pending':
      case 'active':
      case 'fleet':
      case 'staff':
        return canOperate
      case 'cases':
      case 'communications':
        return canViewHistory
      case 'shift':
        return isAuthorized
      default:
        return false
    }
  }

  return {
    user,
    token,
    profile,
    stats,
    loading: authLoading || loading,
    isAuthorized,
    canOperate,
    canAssign,
    canViewHistory,
    shiftStatus,
    canOpenPanel,
    refresh,
  }
}
