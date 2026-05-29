'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { useDriverSocket } from '@/lib/useDriverSocket'
import { driverProfileApi, driverDashboardApi, driverMissionsApi, driverShiftApi, driverNotificationsApi } from '@/lib/driverApi'
import { DriverHeader } from '@/components/driver/DriverHeader'
import { DriverBottomNav } from '@/components/driver/DriverBottomNav'
import { MissionStatusBadge, PriorityBadge, ShiftBadge, StatCard, OfflineBanner, DriverSkeleton } from '@/components/driver/DriverUI'
import toast from 'react-hot-toast'
import {
  MapPin, Clock, User, Ambulance, ArrowRight,
  PlayCircle, StopCircle, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react'

export default function DriverDashboard() {
  const router = useRouter()
  const { user, token, loading: authLoading, logout } = useAuth()
  const isAuthenticated = !!user && !!token
  const { profile, activeMission, stats, unreadCount,
    setProfile, setActiveMission, setStats, setUnreadCount, offlineQueue } = useDriverStore()
  const { connected, emitMissionStatus } = useDriverSocket()

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingShift, setLoadingShift] = useState(false)
  const [shiftStatus, setShiftStatus] = useState<string>('')

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !token)) router.push('/login')
  }, [isAuthenticated, token, router, authLoading])

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [profileData, statsData, missionData, notifData] = await Promise.allSettled([
        driverProfileApi.get(),
        driverDashboardApi.getStats(),
        driverMissionsApi.getActive(),
        driverNotificationsApi.get(1, 1),
      ])

      if (profileData.status === 'fulfilled') {
        setProfile(profileData.value)
        setShiftStatus(profileData.value.shiftStatus)
      }
      if (statsData.status === 'fulfilled') setStats(statsData.value)
      if (missionData.status === 'fulfilled') setActiveMission(missionData.value)
      if (notifData.status === 'fulfilled') setUnreadCount(notifData.value.unreadCount)
    } catch (_) {}
    setLoadingProfile(false)
  }, [])

  useEffect(() => { if (isAuthenticated) loadData() }, [isAuthenticated, loadData])

  const handleStartShift = async () => {
    setLoadingShift(true)
    try {
      await driverShiftApi.start()
      setShiftStatus('ON_DUTY')
      toast.success('Shift started — you are now on duty')
      loadData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to start shift')
    } finally { setLoadingShift(false) }
  }

  const handleEndShift = async () => {
    if (!confirm('End your current shift?')) return
    setLoadingShift(true)
    try {
      await driverShiftApi.end()
      setShiftStatus('AVAILABLE')
      toast.success('Shift ended')
      loadData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to end shift')
    } finally { setLoadingShift(false) }
  }

  const handleLogout = () => {
    logout()
  }

  if (!isAuthenticated) return null

  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Driver'
  const currentShift = shiftStatus || profile?.shiftStatus || 'AVAILABLE'

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
    <div className="driver-app">
      <DriverHeader title="Dashboard" />
      <OfflineBanner queueCount={offlineQueue.length} />

      <main className="driver-main">
        {/* Welcome + Shift Bar */}
        <div className="driver-welcome-bar">
          <div>
            <p className="driver-welcome-greeting">Good {getTimeOfDay()},</p>
            <h2 className="driver-welcome-name">{fullName}</h2>
            {profile?.station && (
              <p className="driver-welcome-station">📍 {profile.station.name}</p>
            )}
          </div>
          <ShiftBadge status={currentShift} />
        </div>

        {/* Ambulance Info Strip */}
        {profile?.assignedAmbulance && (
          <div className="driver-amb-strip">
            <Ambulance size={18} className="text-red-600" />
            <span className="driver-amb-code">{profile.assignedAmbulance.ambulanceNumber}</span>
            <span className="driver-amb-sep">·</span>
            <span className="driver-amb-type">{profile.assignedAmbulance.vehicleType || 'Ambulance'}</span>
            <span className={`driver-amb-status ${profile.assignedAmbulance.status === 'AVAILABLE' ? 'green' : 'orange'}`}>
              {profile.assignedAmbulance.status}
            </span>
          </div>
        )}

        {/* Shift Control */}
        <div className="driver-shift-controls">
          {currentShift === 'ON_DUTY' ? (
            <button className="driver-shift-btn end" onClick={handleEndShift} disabled={loadingShift}>
              {loadingShift ? <Loader2 size={16} className="driver-spin" /> : <StopCircle size={16} />}
              End Shift
            </button>
          ) : (
            <button className="driver-shift-btn start" onClick={handleStartShift} disabled={loadingShift}>
              {loadingShift ? <Loader2 size={16} className="driver-spin" /> : <PlayCircle size={16} />}
              Start Shift
            </button>
          )}
        </div>

        {/* Active Mission Card */}
        {loadingProfile ? (
          <div className="driver-card"><DriverSkeleton lines={4} /></div>
        ) : activeMission ? (
          <div className="driver-active-mission-card">
            <div className="driver-mission-card-header">
              <div className="driver-mission-card-icon">🚨</div>
              <div>
                <p className="driver-mission-tracking">{activeMission.trackingCode}</p>
                <div className="driver-mission-badges">
                  <MissionStatusBadge status={activeMission.status} />
                  <PriorityBadge priority={activeMission.priority} />
                </div>
              </div>
            </div>

            <div className="driver-mission-info-grid">
              <div className="driver-mission-info-item">
                <User size={14} className="driver-info-icon-sm" />
                <div>
                  <p className="driver-info-label-sm">Patient</p>
                  <p className="driver-info-val-sm">{activeMission.patient?.fullName || 'Unknown'}</p>
                </div>
              </div>
              <div className="driver-mission-info-item">
                <MapPin size={14} className="driver-info-icon-sm" />
                <div>
                  <p className="driver-info-label-sm">Pickup</p>
                  <p className="driver-info-val-sm">{activeMission.pickupLocation}</p>
                </div>
              </div>
              {activeMission.pickupLandmark && (
                <div className="driver-mission-info-item">
                  <MapPin size={14} className="driver-info-icon-sm text-orange-500" />
                  <div>
                    <p className="driver-info-label-sm">Landmark</p>
                    <p className="driver-info-val-sm">{activeMission.pickupLandmark}</p>
                  </div>
                </div>
              )}
              {activeMission.incidentCategory && (
                <div className="driver-mission-info-item">
                  <AlertTriangle size={14} className="driver-info-icon-sm text-red-500" />
                  <div>
                    <p className="driver-info-label-sm">Emergency Type</p>
                    <p className="driver-info-val-sm">{activeMission.incidentCategory.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {nextAction && (
              <button className={`driver-quick-action-btn ${nextAction.cls}`} onClick={handleQuickAction}>
                <CheckCircle size={18} />
                {nextAction.label}
              </button>
            )}

            <Link href={`/driver/missions/${activeMission.id}`} className="driver-mission-detail-link">
              View Full Details <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="driver-no-mission-card">
            <div className="driver-no-mission-icon">🟢</div>
            <p className="driver-no-mission-title">No Active Mission</p>
            <p className="driver-no-mission-sub">You will be notified when assigned to an emergency</p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="driver-stats-section">
            <h3 className="driver-section-title">My Performance</h3>
            <div className="driver-stats-grid">
              <StatCard label="Total Missions" value={stats.totalMissions} accent />
              <StatCard label="Completed" value={stats.completedMissions} />
              <StatCard label="Success Rate" value={`${stats.completionRate}%`} accent />
              <StatCard label="Avg Response" value={`${stats.avgResponseMinutes}m`} sub="minutes" />
            </div>
          </div>
        )}

        {/* Socket status */}
        <div className="driver-conn-footer">
          <span className={`driver-dot ${connected ? 'green' : 'red'}`} />
          <span>{connected ? 'Real-time connected' : 'Reconnecting…'}</span>
        </div>

        {/* Logout */}
        <button className="driver-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </main>

      <DriverBottomNav />
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
