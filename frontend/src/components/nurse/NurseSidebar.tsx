'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HeartPulse, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import SidebarNavIconBadge, { NavUnreadCountBadge } from '@/components/navigation/SidebarNavIconBadge'
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import { NURSE_NAV_ITEMS, isNurseNavActive } from '@/lib/nurse/navigation'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useChatStore } from '@/lib/stores/chatStore'

export function NurseSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { fullName, employeeCode, shiftStatus, profilePhoto, firstName, lastName } = useNurseEmployee()
  const unread = useNotificationStore((s) => s.stats?.unread ?? 0)
  const chatUnread = useChatStore((s) => s.unreadTotal)

  const photo = profilePhotoUrl(profilePhoto)

  return (
    <aside className="nurse-sidebar">
      <div className="nurse-sidebar-brand">
        <HeartPulse className="nurse-sidebar-brand-icon" size={22} />
        <div>
          <p className="nurse-sidebar-brand-title">Nurse Panel</p>
          <p className="nurse-sidebar-brand-sub">EADS · Clinical Ops</p>
        </div>
      </div>

      <div className="nurse-sidebar-profile">
        <div className="nurse-sidebar-avatar">
          {photo ? (
            <img src={photo} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span>{getEmployeeInitials(firstName, lastName)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="nurse-sidebar-name truncate">{fullName || 'Nurse'}</p>
          <p className="nurse-sidebar-meta">
            {employeeCode || 'NUR'} · {shiftStatus || 'AVAILABLE'}
          </p>
        </div>
      </div>

      <nav className="nurse-sidebar-nav" aria-label="Nurse navigation">
        {NURSE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isNurseNavActive(pathname, item)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nurse-sidebar-link${active ? ' active' : ''}`}
            >
              <SidebarNavIconBadge icon={Icon} iconClassName="w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
              <NavUnreadCountBadge
                count={
                  item.id === 'notifications'
                    ? unread
                    : item.id === 'messages'
                      ? chatUnread
                      : undefined
                }
                variant={item.id === 'notifications' ? 'red' : 'green'}
              />
            </Link>
          )
        })}
      </nav>

      <button type="button" className="nurse-sidebar-logout" onClick={logout}>
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  )
}
