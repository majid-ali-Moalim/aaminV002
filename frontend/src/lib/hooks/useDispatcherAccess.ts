'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/context/AuthContext'
import { dispatcherProfileApi, dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { isDispatcherUser, isDispatcherActive } from '@/lib/authRedirect'

export { isDispatcherUser, isDispatcherActive } from '@/lib/authRedirect'

export type DispatcherPanel =
  | 'pending'
  | 'active'
  | 'fleet'
  | 'staff'
  | 'cases'
  | 'shift'
  | 'communications'

const DISPATCHER_ACCESS_KEY = 'dispatcher-access'

async function fetchDispatcherAccess() {
  const [profile, stats] = await Promise.all([
    dispatcherProfileApi.get(),
    dispatcherDashboardApi.getStats(),
  ])
  return { profile, stats }
}

export function useDispatcherAccess() {
  const { user, token, loading: authLoading } = useAuth()

  const shouldFetch = !!token && isDispatcherUser(user) && !authLoading

  const { data, isLoading, mutate } = useSWR(
    shouldFetch ? DISPATCHER_ACCESS_KEY : null,
    fetchDispatcherAccess,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    },
  )

  const profile = data?.profile ?? null
  const stats = data?.stats ?? null

  const isAuthorized = !!token && isDispatcherUser(user) && isDispatcherActive(user)
  const shiftStatus =
    profile?.shiftStatus ?? stats?.shiftStatus ?? (user as any)?.employee?.shiftStatus ?? 'OFF_DUTY'
  const canOperate = isAuthorized && ['ON_DUTY', 'AVAILABLE'].includes(shiftStatus)
  const canAssign = canOperate
  const canViewHistory = isAuthorized

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const loading = authLoading || (shouldFetch && isLoading && !data)

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
    loading,
    isAuthorized,
    canOperate,
    canAssign,
    canViewHistory,
    shiftStatus,
    canOpenPanel,
    refresh,
  }
}
