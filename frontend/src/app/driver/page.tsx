'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { isDriverUser, getPostLoginPath } from '@/lib/authRedirect'
import { useDriverStore } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { driverProfileApi, driverDashboardApi, driverMissionsApi, driverNotificationsApi } from '@/lib/driverApi'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import { DriverDashboardOverview } from '@/components/driver/DriverDashboardOverview'
import toast from 'react-hot-toast'

export default function DriverDashboard() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const isAuthenticated = !!user && !!token
  const { profile, activeMission, stats,
    setProfile, setActiveMission, setStats, setUnreadCount } = useDriverStore()
  const { connected, emitMissionStatus } = useDriverSocket()

  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !token) {
      router.replace('/driver/login')
      return
    }
    if (user && !isDriverUser(user) && user.role !== 'ADMIN') {
      router.replace(getPostLoginPath(user))
    }
  }, [isAuthenticated, token, router, authLoading, user])

  const loadData = useCallback(async () => {
    try {
      const [profileData, statsData, missionData, notifData] = await Promise.allSettled([
        driverProfileApi.get(),
        driverDashboardApi.getStats(),
        driverMissionsApi.getActive(),
        driverNotificationsApi.get(1, 1),
      ])

      if (profileData.status === 'fulfilled') setProfile(profileData.value)
      if (statsData.status === 'fulfilled') setStats(statsData.value)
      if (missionData.status === 'fulfilled') setActiveMission(missionData.value)
      if (notifData.status === 'fulfilled') setUnreadCount(notifData.value.unreadCount)
    } catch (_) {}
    setLoadingProfile(false)
  }, [setProfile, setActiveMission, setStats, setUnreadCount])

  useEffect(() => { if (isAuthenticated) loadData() }, [isAuthenticated, loadData])

  if (!isAuthenticated) return null

  const NEXT_ACTIONS: Record<string, { label: string; status: string; cls: string }> = {
    ASSIGNED:         { label: 'Start Trip (En Route)', status: 'DISPATCHED',        cls: 'btn-orange' },
    DISPATCHED:       { label: 'Arrived at Scene',      status: 'ON_SCENE',           cls: 'btn-blue' },
    ON_SCENE:         { label: 'Patient Loaded — Transport', status: 'TRANSPORTING',   cls: 'btn-cyan' },
    TRANSPORTING:     { label: 'Arrived at Hospital',   status: 'ARRIVED_HOSPITAL',   cls: 'btn-purple' },
    ARRIVED_HOSPITAL: { label: 'Complete Mission ✓',    status: 'COMPLETED',          cls: 'btn-green' },
  }

  const nextAction = activeMission ? NEXT_ACTIONS[activeMission.status] : null

  const handleQuickAction = async () => {
    if (!activeMission || !nextAction) return
    try {
      await driverMissionsApi.updateStatus(activeMission.id, nextAction.status)
      emitMissionStatus(activeMission.id, nextAction.status)
      toast.success(`Status updated: ${nextAction.label}`)
      loadData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update status')
    }
  }

  return (
    <DriverPageLayout title="Dashboard Overview" mainClassName="driver-main--dashboard">
      <DriverDashboardOverview
        profile={profile}
        activeMission={activeMission}
        stats={stats}
        loadingProfile={loadingProfile}
        connected={connected}
        onQuickAction={handleQuickAction}
        nextAction={nextAction}
      />
    </DriverPageLayout>
  )
}
