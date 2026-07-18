'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  MapPin, User, ArrowRight,
  AlertTriangle, CheckCircle, MessageCircle, Siren, Clock,
} from 'lucide-react'
import { MissionStatusBadge, PriorityBadge, StatCard, DriverSkeleton } from '@/components/driver/DriverUI'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import type { DriverMission, DriverProfile, DashboardStats } from '@/lib/stores/driverStore'

interface Props {
  profile: DriverProfile | null
  activeMission: DriverMission | null
  stats: DashboardStats | null
  loadingProfile: boolean
  connected: boolean
  onQuickAction: () => void
  nextAction: { label: string; cls: string } | null
}

export function DriverDashboardOverview({
  profile,
  activeMission,
  stats,
  loadingProfile,
  connected,
  onQuickAction,
  nextAction,
}: Props) {
  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Driver'
  const onCase = !!activeMission
  const photoSrc = profilePhotoUrl(profile?.profilePhoto)
  const initials = getEmployeeInitials(profile?.firstName, profile?.lastName)

  return (
    <>
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
        <span className={`driver-presence-badge${onCase ? ' on-case' : ' present'}`}>
          {onCase ? 'On Case' : 'Available'}
        </span>
      </div>

      <div className="driver-card">
        <h3 className="driver-section-title">Case Summary</h3>
        <div className="driver-stats-grid driver-stats-grid--3">
          <StatCard label="Total Cases" value={stats?.totalMissions ?? 0} />
          <StatCard label="Completed Cases" value={stats?.completedMissions ?? 0} accent />
          <StatCard label="Active Case" value={onCase ? 1 : 0} />
        </div>
      </div>

      <div className="driver-card">
        <h3 className="driver-section-title">Quick Actions</h3>
        <div className="driver-quick-actions-grid">
          <Link href="/driver/mission" className="driver-action-tile">
            <Siren size={22} />
            <span>Case Details</span>
          </Link>
          <Link href="/driver/chat" className="driver-action-tile">
            <MessageCircle size={22} />
            <span>Chat Dispatcher</span>
          </Link>
          <Link href="/driver/incidents" className="driver-action-tile">
            <AlertTriangle size={22} />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

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
            Open Case Details <ArrowRight size={16} />
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
