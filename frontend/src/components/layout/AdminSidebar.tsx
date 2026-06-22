'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import { useOptimisticNav } from '@/lib/navigation/optimisticNav'
import EmergencyOperationsSidebar, { isEmergencyOperationsPath } from '@/components/layout/EmergencyOperationsSidebar'
import AaminLogo from '@/components/brand/AaminLogo'
import AmbulanceManagementSidebar, { isAmbulanceManagementPath } from '@/components/layout/AmbulanceManagementSidebar'
import PatientsCaseRecordsSidebar, { isPatientsCaseRecordsPath } from '@/components/layout/PatientsCaseRecordsSidebar'
import DriverManagementSidebar, { isDriverManagementPath } from '@/components/layout/DriverManagementSidebar'
import NurseManagementSidebar, { isNurseManagementPath } from '@/components/layout/NurseManagementSidebar'
import DispatcherDashboardSidebar, { isDispatcherDashboardPath } from '@/components/layout/DispatcherDashboardSidebar'
import PermissionsAccessControlSidebar, { isAccessControlPath } from '@/components/layout/PermissionsAccessControlSidebar'
import {
  LayoutGrid,
  Users,
  Truck,
  Activity,
  FileText,
  Bell,
  LogOut,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Calendar,
  Radio,
  BarChart2,
  UserPlus,
  Shuffle,
  Stethoscope,
  MapPin,
  Warehouse,
  Monitor,
  Siren,
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
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
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

const dispatchResourcesSubMenu = [
  { href: '/admin/ambulances/availability', label: 'Ambulance Availability', icon: Truck },
  { href: '/admin/ambulances/assignment-history', label: 'Ambulance Assignment', icon: Shuffle },
  { href: '/admin/drivers/availability', label: 'Driver Availability', icon: Users },
  { href: '/admin/nurses/availability', label: 'Nurse Availability', icon: Stethoscope },
  { href: '/admin/dispatch-management/readiness', label: 'Readiness Status', icon: Activity },
  { href: '/admin/system-setup/coverage', label: 'Area / Station Coverage', icon: MapPin },
]

const dispatcherManagementSubMenu = [
  { href: '/admin/dispatchers', label: 'All Dispatchers', icon: Users, exact: true },
  { href: '/admin/dispatchers/add', label: 'Add New Dispatcher', icon: UserPlus },
  { href: '/admin/dispatchers/shifts', label: 'Shift & Availability', icon: Calendar },
  { href: '/admin/dispatchers/cases', label: 'Assigned Cases', icon: ClipboardList },
  { href: '/admin/dispatchers/duty-logs', label: 'Duty Logs', icon: FileText },
  { href: '/admin/dispatchers/performance', label: 'Performance Reports', icon: BarChart2 },
  { href: '/admin/dispatchers/activity', label: 'Dispatch Activity', icon: Activity },
]

const dispatchCenterOperationsSubMenu = [
  { href: '/admin/dispatch-management', label: 'Live Dispatch Board', icon: Monitor, exact: true },
  { href: '/admin/assignment-board', label: 'Assignment Board', icon: LayoutGrid },
  { href: '/admin/emergency-requests/pending', label: 'Pending Case Queue', icon: Clock },
  { href: '/admin/emergency-requests/active', label: 'Active Missions', icon: Siren },
]

const hospitalCoordinationSubMenu = [
  { href: '/admin/hospitals', label: 'All Hospitals', icon: Building2, exact: true },
  { href: '/admin/hospitals/create', label: 'Create Hospital', icon: PlusCircle },
  { href: '/admin/hospitals/availability', label: 'Hospital Availability', icon: Activity },
  { href: '/admin/hospitals/incoming', label: 'Incoming Cases', icon: ListTodo },
  { href: '/admin/hospitals/handover', label: 'Handover Queue', icon: Clock },
  { href: '/admin/hospitals/accepted', label: 'Accepted Cases', icon: ShieldCheck },
  { href: '/admin/hospitals/refused', label: 'Refused / Full Cases', icon: XCircle },
  { href: '/admin/hospitals/analytics', label: 'Hospital Performance Analytics', icon: BarChart2 },
]

const workforceSubMenu = [
  { href: '/admin/employees', label: 'All Employees', icon: Users, exact: true },
  { href: '/admin/drivers', label: 'Drivers', icon: Truck },
  { href: '/admin/nurses', label: 'Nurses / Paramedics', icon: Stethoscope },
  { href: '/admin/system-setup?tab=departments', label: 'Departments', icon: Building2 },
  { href: '/admin/employees/attendance', label: 'Attendance Management', icon: Clock },
  { href: '/admin/reports/performance', label: 'Staff Performance', icon: BarChart2 },
]

const analyticsSubMenu = [
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
  { href: '/admin/master-data/settings', label: 'System Settings', icon: Settings },
]

export default function AdminSidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const { isActive: isNavActive } = useOptimisticNav()

  const isDashboardActive =
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard/')
  const isNotificationsActive = pathname.startsWith('/admin/notifications')
  const isEmergencyOperationsActive = isEmergencyOperationsPath(pathname)
  const isPatientsActive = isPatientsCaseRecordsPath(pathname)
  const isDispatcherDashboardActive = isDispatcherDashboardPath(pathname)
  const isDispatchResourcesActive =
    pathname.startsWith('/admin/ambulances/availability') ||
    pathname.startsWith('/admin/drivers/availability') ||
    pathname.startsWith('/admin/nurses/availability') ||
    pathname.startsWith('/admin/dispatch-management/readiness') ||
    pathname.startsWith('/admin/system-setup/coverage')
  const isDispatchCenterOperationsActive =
    (pathname.startsWith('/admin/dispatch-management') && !pathname.includes('/readiness')) ||
    pathname.startsWith('/admin/assignment-board') ||
    pathname === '/admin/emergency-requests/pending' ||
    pathname === '/admin/emergency-requests/active'
  const isDispatcherManagementActive = pathname.startsWith('/admin/dispatchers')
  const isDriversActive = isDriverManagementPath(pathname)
  const isNursesActive = isNurseManagementPath(pathname)
  const isAmbulancesActive = isAmbulanceManagementPath(pathname)
  const isHospitalCoordinationActive = pathname.startsWith('/admin/hospitals')
  const isWorkforceActive =
    pathname.startsWith('/admin/employees') ||
    (pathname.startsWith('/admin/drivers') && !isDispatchResourcesActive) ||
    (pathname.startsWith('/admin/nurses') && !isDispatchResourcesActive)
  const isAccessControlActive = isAccessControlPath(pathname)
  const isAnalyticsActive = pathname.startsWith('/admin/reports')
  const isMasterDataActive = pathname.startsWith('/admin/master-data')

  const [emergencyOperationsOpen, setEmergencyOperationsOpen] = useState(isEmergencyOperationsActive)
  const [patientsOpen, setPatientsOpen] = useState(isPatientsActive)
  const [dispatcherDashboardOpen, setDispatcherDashboardOpen] = useState(isDispatcherDashboardActive)
  const [dispatchResourcesOpen, setDispatchResourcesOpen] = useState(isDispatchResourcesActive)
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

  const renderLink = (href: string, label: string, Icon: React.ElementType, isActive: boolean) => (
    <SidebarNavLink
      navKey={`${label}-${href}`}
      href={href}
      exact={href === '/admin/dashboard'}
      className="flex items-center px-2.5 py-2 text-[13px] font-medium rounded-lg"
      activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text }}
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
      <Icon
        className="w-4 h-4 mr-2.5 shrink-0"
        style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }}
      />
      <span className="truncate">{label}</span>
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
            ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.text }
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
            style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0 ml-1"
            style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
        ) : (
          <ChevronRight
            className="w-3.5 h-3.5 shrink-0 ml-1"
            style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }}
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
                activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text, fontWeight: 600 }}
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
                  style={{ color: active ? SIDEBAR.text : SIDEBAR.muted }}
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
        background: `linear-gradient(180deg, ${SIDEBAR.bg} 0%, #0a101c 100%)`,
        borderRight: `1px solid ${SIDEBAR.border}`,
      }}
    >
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${SIDEBAR.border}` }}>
        <AaminLogo size="sidebar" onDark priority />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-px px-2.5 custom-scrollbar">
        <SectionLabel label="Dashboard" />
        {renderLink('/admin/dashboard', 'Dashboard', LayoutGrid, isDashboardActive)}
        {renderLink('/admin/notifications', 'Notifications', Bell, isNotificationsActive)}

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
        <div className="px-0.5">
          <DispatcherDashboardSidebar
            isOpen={dispatcherDashboardOpen}
            setOpen={setDispatcherDashboardOpen}
          />
        </div>
        {renderCollapsible(
          'Dispatch Resources',
          Warehouse,
          isDispatchResourcesActive,
          dispatchResourcesOpen,
          setDispatchResourcesOpen,
          dispatchResourcesSubMenu,
        )}

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
          { queryBased: true },
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
      </nav>

      <div
        className="p-2.5 shrink-0"
        style={{
          borderTop: `1px solid ${SIDEBAR.border}`,
          backgroundColor: 'rgba(17,24,39,0.5)',
        }}
      >
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center px-2.5 py-2 text-[12px] font-medium rounded-lg transition-all duration-200 group"
          style={{ color: SIDEBAR.muted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = SIDEBAR.primary
            e.currentTarget.style.color = SIDEBAR.text
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
