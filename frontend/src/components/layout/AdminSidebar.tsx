'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { type LucideIcon } from 'lucide-react'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import { useOptimisticNav } from '@/lib/navigation/optimisticNav'
import EmergencyOperationsSidebar, { isEmergencyOperationsPath } from '@/components/layout/EmergencyOperationsSidebar'
import AmbulanceManagementSidebar, { isAmbulanceManagementPath } from '@/components/layout/AmbulanceManagementSidebar'
import PatientsCaseRecordsSidebar, { isPatientsCaseRecordsPath } from '@/components/layout/PatientsCaseRecordsSidebar'
import DriverManagementSidebar, { isDriverManagementPath } from '@/components/layout/DriverManagementSidebar'
import NurseManagementSidebar, { isNurseManagementPath } from '@/components/layout/NurseManagementSidebar'
import PermissionsAccessControlSidebar, { isAccessControlPath } from '@/components/layout/PermissionsAccessControlSidebar'
import AdminSidebarProfile from '@/components/layout/AdminSidebarProfile'
import SidebarNavIconBadge, { NavUnreadCountBadge } from '@/components/navigation/SidebarNavIconBadge'
import { useChatStore } from '@/lib/stores/chatStore'
import { notificationsService } from '@/lib/api'
import useSWR from 'swr'
import {
  LayoutGrid,
  Users,
  Truck,
  Activity,
  FileText,
  Bell,
  MessageSquare,
  LogOut,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Calendar,
  Radio,
  BarChart2,
  UserPlus,
  MapPin,
  Monitor,
  Clock,
  Building2,
  UserCog,
  Database,
  Settings,
  AlertTriangle,
  PlusCircle,
  ShieldCheck,
  XCircle,
  ListTodo,
} from 'lucide-react'

const SIDEBAR = {
  bg: 'hsl(var(--sidebar-bg))',
  panel: 'hsl(var(--sidebar-panel))',
  primary: 'hsl(var(--sidebar-primary))',
  text: 'hsl(var(--sidebar-text))',
  textActive: 'hsl(var(--sidebar-text-active))',
  secondary: 'hsl(var(--sidebar-secondary))',
  muted: 'hsl(var(--sidebar-muted))',
  border: 'hsl(var(--sidebar-border))',
} as const

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-1.5 px-3">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ color: SIDEBAR.muted }}
      >
        {label}
      </span>
    </div>
  )
}

const dispatcherManagementSubMenu = [
  { href: '/admin/dispatchers', label: 'All Dispatchers', icon: Users, exact: true },
  { href: '/admin/dispatchers/add', label: 'Add New Dispatcher', icon: UserPlus },
  { href: '/admin/dispatchers/shifts', label: 'Shift & Availability', icon: Calendar },
  { href: '/admin/dispatchers/cases', label: 'Assigned Cases', icon: ClipboardList },
]

const dispatchCenterOperationsSubMenu = [
  { href: '/admin/dispatch-management', label: 'Live Dispatch Board', icon: Monitor, exact: true },
]

const hospitalCoordinationSubMenu = [
  { href: '/admin/hospitals', label: 'All Hospitals', icon: Building2, exact: true },
  { href: '/admin/hospitals/create', label: 'Create Hospital', icon: PlusCircle },
  { href: '/admin/hospitals/accepted', label: 'Accepted Cases', icon: ShieldCheck },
  { href: '/admin/hospitals/refused', label: 'Rejected Cases', icon: XCircle },
  { href: '/admin/hospitals/analytics', label: 'Hospital Performance', icon: BarChart2 },
]

const workforceSubMenu = [
  { href: '/admin/employees', label: 'All Employees', icon: Users, exact: true },
  { href: '/admin/employees/shifts', label: 'Shift Management', icon: Calendar },
  { href: '/admin/employees/attendance', label: 'Crew Availability', icon: Clock },
  { href: '/admin/employees/attendance/scores', label: 'Availability Reports', icon: BarChart2 },
]

const analyticsSubMenu = [
  { href: '/admin/reports/operations', label: 'Operations Intelligence', icon: BarChart2 },
  { href: '/admin/reports/emergency', label: 'Emergency Reports', icon: FileText },
  { href: '/admin/reports/utilization', label: 'Ambulance Utilization', icon: Truck },
  { href: '/admin/reports/performance', label: 'Staff Performance Reports', icon: Users },
  { href: '/admin/reports/hospitals', label: 'Hospital Acceptance Reports', icon: Building2 },
  { href: '/admin/reports/response-time', label: 'Response Time Analysis', icon: Clock },
  { href: '/admin/reports/outcomes', label: 'Case Outcome Reports', icon: Activity },
  { href: '/admin/reports/export', label: 'Export PDF / Excel', icon: FileText },
]

const masterDataSubMenu = [
  { href: '/admin/master-data/locations', label: 'Locations', icon: MapPin },
  { href: '/admin/master-data/emergency', label: 'Emergency Configuration', icon: AlertTriangle },
  { href: '/admin/master-data/ambulance', label: 'Ambulance Configuration', icon: Truck },
  { href: '/admin/master-data/hospital', label: 'Hospital Configuration', icon: Building2 },
  { href: '/admin/master-data/mission', label: 'Mission Configuration', icon: ClipboardList },
]

export default function AdminSidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const { isActive: isNavActive } = useOptimisticNav()
  const chatUnread = useChatStore((s) => s.unreadTotal)
  const { data: notificationStats } = useSWR('admin-notification-stats', () => notificationsService.getStats(), {
    refreshInterval: 30000,
  })
  const notificationUnread =
    notificationStats?.unread ?? notificationStats?.unreadCount ?? 0

  const isDashboardActive =
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard/')
  const isNotificationsActive = pathname.startsWith('/admin/notifications')
  const isChatActive = pathname.startsWith('/admin/chat')
  const isEmergencyOperationsActive = isEmergencyOperationsPath(pathname)
  const isPatientsActive = isPatientsCaseRecordsPath(pathname)
  const isDispatchCenterOperationsActive = pathname.startsWith('/admin/dispatch-management')
  const isDispatcherManagementActive = pathname.startsWith('/admin/dispatchers')
  const isDriversActive = isDriverManagementPath(pathname)
  const isNursesActive = isNurseManagementPath(pathname)
  const isAmbulancesActive = isAmbulanceManagementPath(pathname)
  const isHospitalCoordinationActive = pathname.startsWith('/admin/hospitals')
  const isWorkforceActive = pathname.startsWith('/admin/employees')
  const isAccessControlActive = isAccessControlPath(pathname)
  const isAnalyticsActive = pathname.startsWith('/admin/reports')
  const isMasterDataActive = pathname.startsWith('/admin/master-data')
  const isSystemSettingsActive = pathname.startsWith('/admin/system-settings')

  const [emergencyOperationsOpen, setEmergencyOperationsOpen] = useState(isEmergencyOperationsActive)
  const [patientsOpen, setPatientsOpen] = useState(isPatientsActive)
  const [dispatchCenterOperationsOpen, setDispatchCenterOperationsOpen] = useState(isDispatchCenterOperationsActive)
  const [dispatcherManagementOpen, setDispatcherManagementOpen] = useState(isDispatcherManagementActive)
  const [driversOpen, setDriversOpen] = useState(isDriversActive)
  const [nursesOpen, setNursesOpen] = useState(isNursesActive)
  const [ambulancesOpen, setAmbulancesOpen] = useState(isAmbulancesActive)
  const [hospitalCoordinationOpen, setHospitalCoordinationOpen] = useState(isHospitalCoordinationActive)
  const [workforceOpen, setWorkforceOpen] = useState(isWorkforceActive)
  const [analyticsOpen, setAnalyticsOpen] = useState(isAnalyticsActive)
  const [masterDataOpen, setMasterDataOpen] = useState(isMasterDataActive)
  const [accessControlOpen, setAccessControlOpen] = useState(isAccessControlActive)

  const renderLink = (
    href: string,
    label: string,
    Icon: LucideIcon,
    isActive: boolean,
    badge?: number,
    badgeVariant: 'green' | 'red' = 'green',
    iconAccent?: string,
  ) => (
    <SidebarNavLink
      navKey={`${label}-${href}`}
      href={href}
      exact={href === '/admin/dashboard'}
      className="flex items-center px-2.5 py-2 text-[13px] font-medium rounded-lg"
      activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.textActive }}
      inactiveStyle={{ color: SIDEBAR.secondary }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = SIDEBAR.panel
          e.currentTarget.style.color = SIDEBAR.text
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = SIDEBAR.secondary
        }
      }}
    >
      <SidebarNavIconBadge
        icon={Icon}
        iconClassName="w-4 h-4 mr-2.5"
        iconColor={isActive ? SIDEBAR.textActive : iconAccent ?? SIDEBAR.muted}
      />
      <span className="truncate flex-1">{label}</span>
      <NavUnreadCountBadge count={badge} variant={badgeVariant} />
    </SidebarNavLink>
  )

  const renderCollapsible = (
    label: string,
    Icon: React.ElementType,
    isActive: boolean,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    subItems: { href: string; label: string; icon: React.ElementType; exact?: boolean }[],
    opts?: { queryBased?: boolean },
  ) => (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-medium rounded-lg"
        style={
          isActive
            ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.textActive }
            : { color: SIDEBAR.secondary }
        }
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = SIDEBAR.panel
            e.currentTarget.style.color = SIDEBAR.text
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = SIDEBAR.secondary
          }
        }}
      >
        <div className="flex items-center min-w-0">
          <Icon
            className="w-4 h-4 mr-2.5 shrink-0"
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0 ml-1"
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
        ) : (
          <ChevronRight
            className="w-3.5 h-3.5 shrink-0 ml-1"
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
        )}
      </button>
      {isOpen && (
        <div
          className="mt-0.5 ml-2 pl-3 space-y-px"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {subItems.map((sub) => {
            const SubIcon = sub.icon
            const navKey = `${sub.label}-${sub.href}`
            let active = false
            if (opts?.queryBased && sub.href.includes('?')) {
              active = typeof window !== 'undefined' && window.location.search.includes(sub.href.split('?')[1])
            } else if (sub.exact) {
              active = isNavActive(navKey, sub.href, true)
            } else {
              active = isNavActive(navKey, sub.href)
            }
            return (
              <SidebarNavLink
                key={navKey}
                navKey={navKey}
                href={sub.href}
                exact={sub.exact}
                className="flex items-center px-2.5 py-1.5 text-xs rounded-md"
                activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.textActive, fontWeight: 600 }}
                inactiveStyle={{ color: SIDEBAR.secondary }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = SIDEBAR.panel
                    e.currentTarget.style.color = SIDEBAR.text
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = SIDEBAR.secondary
                  }
                }}
              >
                <SubIcon
                  className="w-3.5 h-3.5 mr-2 shrink-0"
                  style={{ color: active ? SIDEBAR.textActive : SIDEBAR.muted }}
                />
                <span className="truncate">{sub.label}</span>
              </SidebarNavLink>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div
      className="w-64 h-screen fixed left-0 top-0 flex flex-col z-30"
      style={{
        background: SIDEBAR.bg,
        borderRight: `1px solid ${SIDEBAR.border}`,
      }}
    >
      <AdminSidebarProfile />

      <nav className="flex-1 overflow-y-auto py-2 space-y-px px-2.5 custom-scrollbar">
        <SectionLabel label="Modules" />
        {renderLink('/admin/dashboard', 'Dashboard', LayoutGrid, isDashboardActive)}
        {renderLink('/admin/notifications', 'Notifications', Bell, isNotificationsActive, notificationUnread, 'red', '#EF4444')}
        {renderLink('/admin/chat', 'Communication', MessageSquare, isChatActive, chatUnread, 'green', '#10B981')}

        <SectionLabel label="Emergency Command" />
        <div className="px-0.5">
          <EmergencyOperationsSidebar
            isOpen={emergencyOperationsOpen}
            setOpen={setEmergencyOperationsOpen}
          />
        </div>
        <div className="px-0.5">
          <PatientsCaseRecordsSidebar isOpen={patientsOpen} setOpen={setPatientsOpen} />
        </div>

        <SectionLabel label="Field Operations" />
        <div className="px-0.5">
          <DriverManagementSidebar isOpen={driversOpen} setOpen={setDriversOpen} />
        </div>
        <div className="px-0.5">
          <NurseManagementSidebar isOpen={nursesOpen} setOpen={setNursesOpen} />
        </div>
        <div className="px-0.5">
          <AmbulanceManagementSidebar isOpen={ambulancesOpen} setOpen={setAmbulancesOpen} />
        </div>
        {renderCollapsible(
          'Dispatcher Management',
          Radio,
          isDispatcherManagementActive,
          dispatcherManagementOpen,
          setDispatcherManagementOpen,
          dispatcherManagementSubMenu,
        )}

        <SectionLabel label="Dispatch Center" />
        {renderCollapsible(
          'Dispatch Operations',
          Monitor,
          isDispatchCenterOperationsActive,
          dispatchCenterOperationsOpen,
          setDispatchCenterOperationsOpen,
          dispatchCenterOperationsSubMenu,
        )}

        <SectionLabel label="Hospital Coordination" />
        {renderCollapsible(
          'Hospital Coordination',
          Building2,
          isHospitalCoordinationActive,
          hospitalCoordinationOpen,
          setHospitalCoordinationOpen,
          hospitalCoordinationSubMenu,
        )}

        <SectionLabel label="Organization & Control" />
        {renderCollapsible(
          'Workforce & Organization',
          UserCog,
          isWorkforceActive,
          workforceOpen,
          setWorkforceOpen,
          workforceSubMenu,
        )}
        {renderCollapsible(
          'Analytics & Reports',
          BarChart2,
          isAnalyticsActive,
          analyticsOpen,
          setAnalyticsOpen,
          analyticsSubMenu,
        )}
        {renderCollapsible(
          'Master Data Management',
          Database,
          isMasterDataActive,
          masterDataOpen,
          setMasterDataOpen,
          masterDataSubMenu,
        )}
        <div className="px-0.5">
          <PermissionsAccessControlSidebar
            isOpen={accessControlOpen}
            setOpen={setAccessControlOpen}
          />
        </div>
        {renderLink('/admin/system-settings', 'System Settings', Settings, isSystemSettingsActive)}
      </nav>

      <div
        className="p-2.5 shrink-0 space-y-2"
        style={{
          borderTop: `1px solid ${SIDEBAR.border}`,
          backgroundColor: 'hsl(var(--sidebar-panel))',
        }}
      >
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center px-2.5 py-2 text-[12px] font-medium rounded-lg transition-all duration-200 group"
          style={{ color: SIDEBAR.muted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = SIDEBAR.primary
            e.currentTarget.style.color = SIDEBAR.textActive
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = SIDEBAR.muted
          }}
        >
          <LogOut className="w-3.5 h-3.5 mr-2.5 transition-transform group-hover:-translate-x-1" />
          Logout
        </button>
      </div>
    </div>
  )
}
