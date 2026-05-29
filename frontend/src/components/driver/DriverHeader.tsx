'use client'
import Link from 'next/link'
import { Wifi, WifiOff, Bell, ChevronLeft } from 'lucide-react'
import { useDriverStore } from '@/lib/stores/driverStore'

interface DriverHeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
}

export function DriverHeader({ title, showBack, backHref = '/driver' }: DriverHeaderProps) {
  const { isOnline, isSocketConnected, unreadCount, profile } = useDriverStore()

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
        <div className={`driver-conn-indicator ${isSocketConnected ? 'online' : 'offline'}`}>
          {isSocketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isSocketConnected ? 'Live' : 'Offline'}</span>
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
