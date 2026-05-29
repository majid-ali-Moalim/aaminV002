'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import EmergencyOperationsSidebar, { isEmergencyOperationsPath } from '@/components/layout/EmergencyOperationsSidebar'
import {
  LayoutDashboard,
  Users,
  Truck, 
  Activity,
  FileText,
  Bell,
  Settings,
  LogOut,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UserCog,
  Calendar,
  Radio,
  Shield,
  Clock,
  BarChart2,
  UserPlus,
  Shuffle,
  Stethoscope,
  Medal,
  AlertCircle,
  MapPin,
  Map as MapIcon,
  History,
  Database,
  Warehouse,
  Building2,
  AlertTriangle,
  Siren,
  HeartPulse,
  ScrollText,
  Lock,
  Eye,
  LayoutGrid,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Ban,
  Timer as TimerIcon,
  Monitor,
  PieChart,
  ShieldCheck,
  PlusCircle,
  ListTodo,
  LifeBuoy,
  Key,
  Terminal
} from 'lucide-react'

// ─── Section Divider Component ───
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-1.5 px-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</span>
    </div>
  )
}

// ─── Sub-menu Configurations ───

// 1. Dashboard
const dashboardSubMenu = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/admin/dashboard/live', label: 'Live Operations', icon: Monitor },
  { href: '/admin/dashboard/kpi', label: 'KPI Summary', icon: PieChart },
  { href: '/admin/notifications/urgent', label: 'Alerts & Notifications', icon: AlertCircle },
  { href: '/admin/audit-logs/recent', label: 'Recent Activity', icon: History },
]

// 2. Emergency Operations — rendered via EmergencyOperationsSidebar component

// 3. Patients & Case Records
const patientsSubMenu = [
  { href: '/admin/patients', label: 'All Patients', icon: Users, exact: true },
  { href: '/admin/patients/new', label: 'New Patient Record', icon: UserPlus },
  { href: '/admin/emergency-requests/records', label: 'Emergency Case Records', icon: FileText },
  { href: '/admin/nurses/notes', label: 'Medical Notes', icon: LifeBuoy },
  { href: '/admin/patients/history', label: 'Case History', icon: History },
  { href: '/admin/patients/contacts', label: 'Relative / Contact Details', icon: Users },
]

// 4. Dispatch Resources
const dispatchResourcesSubMenu = [
  { href: '/admin/ambulances/availability', label: 'Ambulance Availability', icon: Truck },
  { href: '/admin/ambulances/assignments', label: 'Ambulance Assignment', icon: Shuffle },
  { href: '/admin/drivers/availability', label: 'Driver Availability', icon: Users },
  { href: '/admin/nurses/availability', label: 'Nurse Availability', icon: Stethoscope },
  { href: '/admin/dispatch-management/readiness', label: 'Readiness Status', icon: Activity },
  { href: '/admin/system-setup/coverage', label: 'Area / Station Coverage', icon: MapPin },
]

// 4b. Dispatch Center — Dispatcher Management
const dispatcherManagementSubMenu = [
  { href: '/admin/dispatchers', label: 'All Dispatchers', icon: Users, exact: true },
  { href: '/admin/dispatchers/add', label: 'Add New Dispatcher', icon: UserPlus },
  { href: '/admin/dispatchers/shifts', label: 'Shift & Availability', icon: Calendar },
  { href: '/admin/dispatchers/cases', label: 'Assigned Cases', icon: ClipboardList },
  { href: '/admin/dispatchers/duty-logs', label: 'Duty Logs', icon: FileText },
  { href: '/admin/dispatchers/performance', label: 'Performance Reports', icon: BarChart2 },
  { href: '/admin/dispatchers/activity', label: 'Dispatch Activity', icon: Activity },
]

// 4c. Dispatch Center — Operations
const dispatchCenterOperationsSubMenu = [
  { href: '/admin/dispatch-management', label: 'Live Dispatch Board', icon: Monitor, exact: true },
  { href: '/admin/assignment-board', label: 'Assignment Board', icon: LayoutGrid },
  { href: '/admin/emergency-requests/pending', label: 'Pending Case Queue', icon: Clock },
  { href: '/admin/emergency-requests/active', label: 'Active Missions', icon: Siren },
]

// 5. Drivers
const driversSubMenu = [
  { href: '/admin/drivers', label: 'All Drivers', icon: Users, exact: true },
  { href: '/admin/drivers/missions', label: 'Assigned Missions', icon: ClipboardList },
  { href: '/admin/drivers/shifts', label: 'Shift & Availability', icon: Calendar },
  { href: '/admin/drivers/updates', label: 'Status Updates', icon: Radio },
  { href: '/admin/drivers/duty-logs', label: 'Duty Logs', icon: FileText },
  { href: '/admin/drivers/performance', label: 'Performance Reports', icon: BarChart2 },
  { href: '/admin/drivers/incidents', label: 'Incident Reports', icon: AlertCircle },
]

// 6. Nurses & Paramedics
const nursesSubMenu = [
  { href: '/admin/nurses', label: 'All Nurses', icon: Users, exact: true },
  { href: '/admin/nurses/missions', label: 'Assigned Missions', icon: ClipboardList },
  { href: '/admin/nurses/shifts', label: 'Shift & Availability', icon: Calendar },
  { href: '/admin/nurses/treatment-logs', label: 'Treatment Logs', icon: LifeBuoy },
  { href: '/admin/nurses/clinical-notes', label: 'Clinical Notes', icon: FileText },
  { href: '/admin/nurses/handover', label: 'Handover Records', icon: Shuffle },
  { href: '/admin/nurses/performance', label: 'Performance Reports', icon: BarChart2 },
]

// 7. Ambulances
const ambulancesSubMenu = [
  { href: '/admin/ambulances', label: 'All Ambulances', icon: Truck, exact: true },
  { href: '/admin/ambulances/add', label: 'Add Ambulance', icon: UserPlus },
  { href: '/admin/ambulances/status', label: 'Current Status', icon: Activity },
  { href: '/admin/ambulances/crew', label: 'Assign Crew', icon: Shuffle },
  { href: '/admin/ambulances/readiness', label: 'Readiness Status', icon: ShieldCheck },
  { href: '/admin/ambulances/station-assignment', label: 'Area / Station Assignment', icon: Warehouse },
  { href: '/admin/ambulances/history', label: 'Service History', icon: History },
]

// 8. Hospital Coordination
const hospitalCoordinationSubMenu = [
  { href: '/admin/hospitals', label: 'All Hospitals', icon: Building2, exact: true },
  { href: '/admin/hospitals/availability', label: 'Hospital Availability', icon: Activity },
  { href: '/admin/hospitals/incoming', label: 'Incoming Cases', icon: ListTodo },
  { href: '/admin/hospitals/handover', label: 'Handover Queue', icon: Clock },
  { href: '/admin/hospitals/accepted', label: 'Accepted Cases', icon: ShieldCheck },
  { href: '/admin/hospitals/refused', label: 'Refused / Full Cases', icon: XCircle },
  { href: '/admin/hospitals/referrals', label: 'Referral History', icon: History },
  { href: '/admin/hospitals/analytics', label: 'Hospital Performance Analytics', icon: BarChart2 },
]

// 9. Workforce & Organization
const workforceSubMenu = [
  { href: '/admin/employees', label: 'All Employees', icon: Users, exact: true },
  { href: '/admin/drivers', label: 'Drivers', icon: Truck },
  { href: '/admin/nurses', label: 'Nurses / Paramedics', icon: Stethoscope },
  { href: '/admin/permissions', label: 'Roles & Permissions', icon: Lock },
  { href: '/admin/system-setup?tab=departments', label: 'Departments', icon: Building2 },
  { href: '/admin/employees/attendance', label: 'Attendance & Duty Logs', icon: Clock },
  { href: '/admin/reports/performance', label: 'Staff Performance', icon: BarChart2 },
]

// 10. Analytics & Reports
const analyticsSubMenu = [
  { href: '/admin/reports/emergency', label: 'Emergency Reports', icon: FileText },
  { href: '/admin/reports/utilization', label: 'Ambulance Utilization', icon: Truck },
  { href: '/admin/reports/performance', label: 'Staff Performance Reports', icon: Users },
  { href: '/admin/reports/hospitals', label: 'Hospital Acceptance Reports', icon: Building2 },
  { href: '/admin/reports/response-time', label: 'Response Time Analysis', icon: Clock },
  { href: '/admin/reports/outcomes', label: 'Case Outcome Reports', icon: Activity },
  { href: '/admin/reports/export', label: 'Export PDF / Excel', icon: FileText },
]

// 11. Notifications & Alerts
const notificationsSubMenu = [
  { href: '/admin/notifications', label: 'All Notifications', icon: Bell, exact: true },
  { href: '/admin/notifications/critical', label: 'Critical Alerts', icon: AlertCircle },
  { href: '/admin/notifications/assignments', label: 'Assignment Alerts', icon: Shuffle },
  { href: '/admin/notifications/delays', label: 'Delay Alerts', icon: Clock },
  { href: '/admin/notifications/hospitals', label: 'Hospital Alerts', icon: Building2 },
  { href: '/admin/notifications/maintenance', label: 'Maintenance Alerts', icon: Settings },
  { href: '/admin/notifications/staff', label: 'Staff Alerts', icon: Users },
]

// 12. System Setup
const systemSetupSubMenu = [
  { href: '/admin/system-setup/regions', label: 'Regions', icon: MapPin },
  { href: '/admin/system-setup/districts', label: 'Districts', icon: MapIcon },
  { href: '/admin/system-setup/stations', label: 'Stations', icon: Warehouse },
  { href: '/admin/system-setup/categories', label: 'Incident Categories', icon: AlertTriangle },
  { href: '/admin/system-setup/ambulance-types', label: 'Ambulance Types', icon: Truck },
  { href: '/admin/system-setup/equipment', label: 'Equipment Levels', icon: Stethoscope },
  { href: '/admin/system-setup/hospital-types', label: 'Hospital Types', icon: Building2 },
  { href: '/admin/system-setup/departments', label: 'Departments', icon: Building2 },
  { href: '/admin/system-setup/settings', label: 'System Settings', icon: Settings },
  { href: '/admin/system-setup/security', label: 'Security Settings', icon: Key },
]

// 13. Audit Logs
const auditLogsSubMenu = [
  { href: '/admin/audit-logs/actions', label: 'User Action Logs', icon: Terminal },
  { href: '/admin/audit-logs/dispatch', label: 'Dispatch Change Logs', icon: Shuffle },
  { href: '/admin/audit-logs/status', label: 'Status Update Logs', icon: Radio },
  { href: '/admin/audit-logs/handover', label: 'Hospital Handover Logs', icon: Clock },
  { href: '/admin/audit-logs/system', label: 'System Logs', icon: Database },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  // ─── Active state checks ───
  const isDashboardActive = pathname.startsWith('/admin/dashboard')
  const isEmergencyOperationsActive = isEmergencyOperationsPath(pathname)
  const isPatientsActive = pathname.startsWith('/admin/patients')
  const isDispatchResourcesActive = pathname.startsWith('/admin/ambulances/availability') || pathname.startsWith('/admin/drivers/availability')
  const isDispatchCenterOperationsActive =
    pathname.startsWith('/admin/dispatch-management') ||
    pathname.startsWith('/admin/assignment-board') ||
    pathname === '/admin/emergency-requests/pending' ||
    pathname === '/admin/emergency-requests/active'
  const isDispatcherManagementActive = pathname.startsWith('/admin/dispatchers')
  const isDriversActive = pathname.startsWith('/admin/drivers') && !isDispatchResourcesActive
  const isNursesActive = pathname.startsWith('/admin/nurses') && !isDispatchResourcesActive
  const isAmbulancesActive = pathname.startsWith('/admin/ambulances') && !isDispatchResourcesActive
  const isHospitalCoordinationActive = pathname.startsWith('/admin/hospitals')
  const isWorkforceActive =
    pathname.startsWith('/admin/employees') ||
    pathname.startsWith('/admin/permissions') ||
    (pathname.startsWith('/admin/drivers') && !isDispatchResourcesActive) ||
    (pathname.startsWith('/admin/nurses') && !isDispatchResourcesActive)
  const isAnalyticsActive = pathname.startsWith('/admin/reports')
  const isNotificationsActive = pathname.startsWith('/admin/notifications')
  const isSystemSetupActive = pathname.startsWith('/admin/system-setup')
  const isAuditActive = pathname.startsWith('/admin/audit-logs')

  // ─── Toggle states ───
  const [dashboardOpen, setDashboardOpen] = useState(isDashboardActive)
  const [emergencyOperationsOpen, setEmergencyOperationsOpen] = useState(isEmergencyOperationsActive)
  const [patientsOpen, setPatientsOpen] = useState(isPatientsActive)
  const [dispatchResourcesOpen, setDispatchResourcesOpen] = useState(isDispatchResourcesActive)
  const [dispatchCenterOperationsOpen, setDispatchCenterOperationsOpen] = useState(isDispatchCenterOperationsActive)
  const [dispatcherManagementOpen, setDispatcherManagementOpen] = useState(isDispatcherManagementActive)
  const [driversOpen, setDriversOpen] = useState(isDriversActive)
  const [nursesOpen, setNursesOpen] = useState(isNursesActive)
  const [ambulancesOpen, setAmbulancesOpen] = useState(isAmbulancesActive)
  const [hospitalCoordinationOpen, setHospitalCoordinationOpen] = useState(isHospitalCoordinationActive)
  const [workforceOpen, setWorkforceOpen] = useState(isWorkforceActive)
  const [analyticsOpen, setAnalyticsOpen] = useState(isAnalyticsActive)
  const [notificationsOpen, setNotificationsOpen] = useState(isNotificationsActive)
  const [systemSetupOpen, setSystemSetupOpen] = useState(isSystemSetupActive)
  const [auditOpen, setAuditOpen] = useState(isAuditActive)

  const renderLink = (href: string, label: string, Icon: any, isActive: boolean) => (
    <Link
      href={href}
      className={`flex items-center px-2.5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-red-600 text-white shadow-md shadow-red-200 font-semibold'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
      <span className="truncate">{label}</span>
    </Link>
  )

  const renderCollapsible = (
    label: string,
    Icon: any,
    isActive: boolean,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    subItems: any[],
    opts?: { queryBased?: boolean }
  ) => (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-red-600 text-white shadow-md shadow-red-200 font-semibold'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center min-w-0">
          <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-1 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ml-1 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        )}
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-slate-200 space-y-px">
          {subItems.map((sub) => {
            const SubIcon = sub.icon
            let active = false
            if (opts?.queryBased && sub.href.includes('?')) {
              active = typeof window !== 'undefined' && window.location.search.includes(sub.href.split('?')[1])
            } else if ((sub as any).exact) {
              active = pathname === sub.href
            } else {
              active = pathname.startsWith(sub.href)
            }
            return (
              <Link
                key={sub.label + sub.href}
                href={sub.href}
                className={`flex items-center px-2.5 py-1.5 text-xs rounded-md transition-all duration-200 ${
                  active
                    ? 'bg-red-600 text-white font-semibold shadow-sm shadow-red-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <SubIcon className={`w-3.5 h-3.5 mr-2 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{sub.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="w-64 bg-white text-slate-700 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-200 shadow-sm z-30">
      {/* Logo */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center">
          <div className="bg-red-600 p-1.5 rounded-lg mr-2.5 shadow-md shadow-red-200">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span>
            Aamin <span className="text-slate-400 font-light text-xs">Ambulance</span>
          </span>
        </h1>
      </div>
      
      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-px px-2.5 custom-scrollbar">
        
        {/* ══════ General ══════ */}
        <SectionLabel label="General" />
        {renderCollapsible('Dashboard', LayoutDashboard, isDashboardActive, dashboardOpen, setDashboardOpen, dashboardSubMenu)}

        {/* ══════ Emergency Command ══════ */}
        <SectionLabel label="Emergency Command" />
        <div className="px-0.5">
          <EmergencyOperationsSidebar
            isOpen={emergencyOperationsOpen}
            setOpen={setEmergencyOperationsOpen}
          />
        </div>
        {renderCollapsible('Patients & Case Records', HeartPulse, isPatientsActive, patientsOpen, setPatientsOpen, patientsSubMenu)}
        {renderCollapsible('Dispatch Resources', Warehouse, isDispatchResourcesActive, dispatchResourcesOpen, setDispatchResourcesOpen, dispatchResourcesSubMenu)}

        {/* ══════ Dispatch Center ══════ */}
        <SectionLabel label="Dispatch Center" />
        {renderCollapsible('Dispatch Operations', Monitor, isDispatchCenterOperationsActive, dispatchCenterOperationsOpen, setDispatchCenterOperationsOpen, dispatchCenterOperationsSubMenu)}
        {renderCollapsible('Dispatcher Management', Radio, isDispatcherManagementActive, dispatcherManagementOpen, setDispatcherManagementOpen, dispatcherManagementSubMenu)}

        {/* ══════ Field Operations ══════ */}
        <SectionLabel label="Field Operations" />
        {renderCollapsible('Drivers', Users, isDriversActive, driversOpen, setDriversOpen, driversSubMenu)}
        {renderCollapsible('Nurses & Paramedics', Stethoscope, isNursesActive, nursesOpen, setNursesOpen, nursesSubMenu)}
        {renderCollapsible('Ambulances', Truck, isAmbulancesActive, ambulancesOpen, setAmbulancesOpen, ambulancesSubMenu)}

        {/* ══════ Hospital Coordination ══════ */}
        <SectionLabel label="Hospital Coordination" />
        {renderCollapsible('Hospital Coordination', Building2, isHospitalCoordinationActive, hospitalCoordinationOpen, setHospitalCoordinationOpen, hospitalCoordinationSubMenu)}

        {/* ══════ Organization & Control ══════ */}
        <SectionLabel label="Organization & Control" />
        {renderCollapsible('Workforce & Organization', UserCog, isWorkforceActive, workforceOpen, setWorkforceOpen, workforceSubMenu)}
        {renderCollapsible('Analytics & Reports', BarChart2, isAnalyticsActive, analyticsOpen, setAnalyticsOpen, analyticsSubMenu)}
        {renderCollapsible('Notifications & Alerts', Bell, isNotificationsActive, notificationsOpen, setNotificationsOpen, notificationsSubMenu)}
        {renderCollapsible('System Setup', Database, isSystemSetupActive, systemSetupOpen, setSystemSetupOpen, systemSetupSubMenu)}
        {renderCollapsible('Audit Logs', ScrollText, isAuditActive, auditOpen, setAuditOpen, auditLogsSubMenu)}

      </nav>
      
      {/* Bottom Logout */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <Link
          href="/logout"
          className="flex items-center px-2.5 py-2 text-[12px] font-medium text-slate-500 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 group"
        >
          <LogOut className="w-3.5 h-3.5 mr-2.5 transition-transform group-hover:-translate-x-1" />
          Logout
        </Link>
      </div>
    </div>
  )
}
