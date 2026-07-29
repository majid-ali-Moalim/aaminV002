'use client'

import { LogOut, X, MessageSquare, Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import DispatcherEmergencyCommandSidebar from '@/components/dispatcher/DispatcherEmergencyCommandSidebar'
import DispatcherAccountSidebar from '@/components/dispatcher/DispatcherAccountSidebar'
import { DISPATCHER_DASHBOARD_ITEM } from '@/lib/dispatcher/emergencyCommandNav'
import { DISPATCHER_SIDEBAR } from '@/lib/dispatcher/dispatcherSidebarTheme'
import AaminLogo from '@/components/brand/AaminLogo'
import { useChatStore } from '@/lib/stores/chatStore'
import { useDispatcherUiStore } from '@/lib/stores/dispatcherUiStore'
import useSWR from 'swr'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'

interface Props {
  open?: boolean
  onClose?: () => void
}

export default function DispatcherSidebarSections({ open = false, onClose }: Props) {
  const { logout } = useAuth()
  const theme = useDispatcherUiStore((s) => s.theme)
  const chatUnread = useChatStore((s) => s.unreadTotal)
  const { data: notificationStats } = useSWR('dispatcher-notification-stats', () =>
    dispatcherDashboardApi.getNotificationStats(),
    { refreshInterval: 30000 },
  )
  const notificationUnread =
    notificationStats?.unread ?? notificationStats?.unreadCount ?? 0

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`w-72 max-w-[90vw] h-screen fixed left-0 top-0 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: DISPATCHER_SIDEBAR.bg,
          borderRight: `1px solid ${DISPATCHER_SIDEBAR.border}`,
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-4 py-4 shrink-0 border-b"
          style={{ borderColor: DISPATCHER_SIDEBAR.border }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AaminLogo size="sidebar" onDark={theme === 'dark'} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 rounded-md transition-colors"
            style={{ color: DISPATCHER_SIDEBAR.secondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = DISPATCHER_SIDEBAR.text
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = DISPATCHER_SIDEBAR.secondary
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          <div className="pt-2 pb-1.5 px-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: DISPATCHER_SIDEBAR.muted }}
            >
              Dashboard
            </span>
          </div>
          <div className="px-0.5 mb-1">
            <SidebarMenuLink
              navKey="dispatcher-dashboard"
              href={DISPATCHER_DASHBOARD_ITEM.href}
              label={DISPATCHER_DASHBOARD_ITEM.label}
              icon={DISPATCHER_DASHBOARD_ITEM.icon}
              exact={DISPATCHER_DASHBOARD_ITEM.exact}
              sidebar={DISPATCHER_SIDEBAR}
              accentColor={
                DISPATCHER_DASHBOARD_ITEM.accent
                  ? DISPATCHER_SIDEBAR[DISPATCHER_DASHBOARD_ITEM.accent]
                  : DISPATCHER_SIDEBAR.muted
              }
              className="flex items-center gap-2.5 px-2.5 py-2.5 mb-0.5 rounded-lg text-[13px] font-semibold"
              onNavigate={onClose}
            />
            <SidebarMenuLink
              navKey="dispatcher-chat"
              href="/dispatcher/chat"
              label="Communication"
              icon={MessageSquare}
              sidebar={DISPATCHER_SIDEBAR}
              accentColor="#10B981"
              className="flex items-center gap-2.5 px-2.5 py-2.5 mb-0.5 rounded-lg text-[13px] font-semibold"
              onNavigate={onClose}
              badge={chatUnread}
              badgeVariant="green"
            />
            <SidebarMenuLink
              navKey="dispatcher-notifications"
              href="/dispatcher/alerts/all"
              label="Notifications"
              icon={Bell}
              sidebar={DISPATCHER_SIDEBAR}
              accentColor="#EF4444"
              className="flex items-center gap-2.5 px-2.5 py-2.5 mb-0.5 rounded-lg text-[13px] font-semibold"
              onNavigate={onClose}
              badge={notificationUnread}
              badgeVariant="red"
            />
          </div>

          <DispatcherEmergencyCommandSidebar onNavigate={onClose} />
          <DispatcherAccountSidebar onNavigate={onClose} />
        </nav>

        <div className="p-2 shrink-0" style={{ borderTop: `1px solid ${DISPATCHER_SIDEBAR.border}` }}>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-[12px] font-medium rounded-lg"
            style={{ color: DISPATCHER_SIDEBAR.muted }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
