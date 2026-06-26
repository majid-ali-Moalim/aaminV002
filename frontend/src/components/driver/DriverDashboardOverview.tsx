'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  MapPin, User, Truck, ArrowRight, PlayCircle, StopCircle,
  AlertTriangle, CheckCircle, Loader2, Phone, Siren, Clock, Coffee,
} from 'lucide-react'
import { MissionStatusBadge, PriorityBadge, ShiftBadge, StatCard, DriverSkeleton } from '@/components/driver/DriverUI'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import type { DriverMission, DriverProfile, DashboardStats } from '@/lib/stores/driverStore'

interface Props {
  profile: DriverProfile | null
  activeMission: DriverMission | null
  stats: DashboardStats | null
  loadingProfile: boolean
  loadingShift: boolean
  currentShift: string
  connected: boolean
  onStartShift: () => void
  onEndShift: () => void
  onQuickAction: () => void
  nextAction: { label: string; cls: string } | null
}

export function DriverDashboardOverview({
  profile,
  activeMission,
  stats,
  loadingProfile,
  loadingShift,
  currentShift,
  connected,
  onStartShift,
  onEndShift,
  onQuickAction,
  nextAction,
}: Props) {
  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Driver'
  const statusLabel = getStatusLabel(currentShift, !!activeMission)
  const photoSrc = profilePhotoUrl(profile?.profilePhoto)
  const initials = getEmployeeInitials(profile?.firstName, profile?.lastName)

  return (
    <>
      {/* Hero welcome */}
      <div className="driver-dash-hero">
        <div className="driver-dash-hero-main">
          <Link href="/driver/profile" className="driver-dash-avatar" aria-label="Open profile">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt={fullName}
                width={56}
                height={56}
                className="driver-dash-avatar-img"
                unoptimized
              />
            ) : (
              <span className="driver-dash-avatar-fallback">{initials}</span>
            )}
          </Link>
          <div className="driver-dash-hero-text">
            <p className="driver-welcome-greeting">Welcome back</p>
            <h2 className="driver-welcome-name">{fullName}</h2>
            {profile?.station && (
              <p className="driver-welcome-station">
                <MapPin size={12} className="inline mr-1" />
                {profile.station.name}
              </p>
            )}
          </div>
        </div>
        <ShiftBadge status={currentShift} />
      </div>

      {/* Status + mission summary row */}
      <div className="driver-dash-grid">
        <div className="driver-card driver-status-card">
          <h3 className="driver-section-title">Current Status</h3>
          <div className="driver-status-pills">
            <StatusPill label="On Duty" active={currentShift === 'ON_DUTY'} />
            <StatusPill label="Off Duty" active={currentShift === 'OFF_DUTY' || currentShift === 'AVAILABLE'} />
            <StatusPill label="On Mission" active={!!activeMission} />
            <StatusPill label="Break" active={currentShift === 'ON_BREAK'} />
          </div>
          <p className="driver-status-summary">{statusLabel}</p>
        </div>

        <div className="driver-card">
          <h3 className="driver-section-title">Mission Summary</h3>
          <div className="driver-stats-grid driver-stats-grid--2x2">
            <StatCard label="Active" value={activeMission ? 1 : 0} accent />
            <StatCard label="Assigned" value={activeMission?.status === 'ASSIGNED' ? 1 : 0} />
            <StatCard label="Completed Today" value={stats?.completedMissions ?? 0} />
            <StatCard label="Pending" value={activeMission ? 0 : 0} />
          </div>
        </div>
      </div>

      {/* Ambulance strip */}
      {profile?.assignedAmbulance && (
        <div className="driver-amb-strip">
          <Truck size={18} className="driver-amb-icon" />
          <span className="driver-amb-code">{profile.assignedAmbulance.ambulanceNumber}</span>
          <span className="driver-amb-sep">·</span>
          <span className="driver-amb-type">{profile.assignedAmbulance.vehicleType || 'Ambulance'}</span>
          <span className={`driver-amb-status ${profile.assignedAmbulance.status === 'AVAILABLE' ? 'green' : 'orange'}`}>
            {profile.assignedAmbulance.status}
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="driver-card">
        <h3 className="driver-section-title">Quick Actions</h3>
        <div className="driver-quick-actions-grid">
          <Link href="/driver/shifts" className="driver-action-tile">
            <PlayCircle size={22} />
            <span>Start Shift</span>
          </Link>
          <Link href="/driver/mission" className="driver-action-tile">
            <Siren size={22} />
            <span>Case Workspace</span>
          </Link>
          <a href="tel:+1911" className="driver-action-tile">
            <Phone size={22} />
            <span>Dispatcher</span>
          </a>
          <Link href="/driver/incidents" className="driver-action-tile">
            <AlertTriangle size={22} />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

      {/* Shift Control */}
      <div className="driver-shift-controls">
        {currentShift === 'ON_DUTY' ? (
          <button type="button" className="driver-shift-btn end" onClick={onEndShift} disabled={loadingShift}>
            {loadingShift ? <Loader2 size={16} className="driver-spin" /> : <StopCircle size={16} />}
            End Shift
          </button>
        ) : (
          <button type="button" className="driver-shift-btn start" onClick={onStartShift} disabled={loadingShift}>
            {loadingShift ? <Loader2 size={16} className="driver-spin" /> : <PlayCircle size={16} />}
            Clock In / Start Shift
          </button>
        )}
        {currentShift === 'ON_DUTY' && (
          <Link href="/driver/shifts" className="driver-shift-btn break">
            <Coffee size={16} /> Break
          </Link>
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
          </div>
          <PickupGpsPanel request={activeMission} variant="compact" />
          {nextAction && (
            <button type="button" className={`driver-quick-action-btn ${nextAction.cls}`} onClick={onQuickAction}>
              <CheckCircle size={18} />
              {nextAction.label}
            </button>
          )}
          <Link href="/driver/mission" className="driver-mission-detail-link">
            Open Mission Center <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="driver-no-mission-card">
          <div className="driver-no-mission-icon">🟢</div>
          <p className="driver-no-mission-title">No Active Mission</p>
          <p className="driver-no-mission-sub">Stand by for dispatch assignment</p>
        </div>
      )}

      <div className="driver-conn-footer">
        <span className={`driver-dot ${connected ? 'green' : 'red'}`} />
        <span>{connected ? 'Real-time connected' : 'Reconnecting…'}</span>
        <Clock size={12} className="ml-auto opacity-50" />
      </div>
    </>
  )
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`driver-status-pill${active ? ' active' : ''}`}>{label}</span>
  )
}

function getStatusLabel(shift: string, onMission: boolean) {
  if (onMission) return 'Currently on an active emergency mission.'
  if (shift === 'ON_DUTY') return 'On duty and available for dispatch assignments.'
  if (shift === 'ON_BREAK') return 'On break — not available for new missions.'
  return 'Off duty — clock in to receive mission assignments.'
}
