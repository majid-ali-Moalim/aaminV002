'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Wifi, WifiOff, Bell, ChevronLeft } from 'lucide-react'
import { useDriverStore } from '@/lib/stores/driverStore'
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import { DriverThemeToggle } from '@/components/driver/DriverThemeToggle'

interface DriverHeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
}

export function DriverHeader({ title, showBack, backHref = '/driver' }: DriverHeaderProps) {
  const { isSocketConnected, unreadCount, profile } = useDriverStore()
  const photoSrc = profilePhotoUrl(profile?.profilePhoto)
  const initials = getEmployeeInitials(profile?.firstName, profile?.lastName)

  return (
    <header className="driver-header">
      <div className="driver-header-left">
        {showBack ? (
          <Link href={backHref} className="driver-back-btn">
            <ChevronLeft size={22} />
          </Link>
        ) : (
          <div className="driver-logo">
            <span className="driver-logo-cross">✚</span>
            <span className="driver-logo-text">EADS</span>
          </div>
        )}
        {!showBack && profile ? (
          <Link href="/driver/profile" className="driver-header-avatar">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt={`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Driver'}
                width={36}
                height={36}
                className="driver-header-avatar-img"
                unoptimized
              />
            ) : (
              <span className="driver-header-avatar-fallback">{initials}</span>
            )}
          </Link>
        ) : null}
        <div>
          <h1 className="driver-header-title">{title}</h1>
          {!showBack && profile && (
            <p className="driver-header-sub">
              {profile.firstName} {profile.lastName}
            </p>
          )}
        </div>
      </div>
      <div className="driver-header-right">
        <DriverThemeToggle compact />
        <div className={`driver-conn-indicator ${isSocketConnected ? 'online' : 'offline'}`}>
          {isSocketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="conn-label">{isSocketConnected ? 'Live' : 'Offline'}</span>
        </div>
        <Link href="/driver/notifications" className="driver-notif-btn">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="driver-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>
      </div>
    </header>
  )
}
