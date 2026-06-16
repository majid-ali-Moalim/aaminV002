'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  LayoutGrid,
  Loader2,
  Plus,
  Radio,
  Truck,
  Users,
  Zap,
} from 'lucide-react'
import { notificationsService } from '@/lib/api'
import type { UnifiedDashboardData } from '@/lib/dashboard/unifiedDashboard'
import { Employee, Ambulance } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#3B82F6',
  LOW: '#10B981',
}

export function DashboardSection({
  id,
  icon: Icon,
  title,
  children,
  className = '',
}: {
  id?: string
  icon: typeof Activity
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`scroll-mt-20 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
        <Icon className="w-4 h-4 text-red-600 shrink-0" />
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function DashboardAnalytics({ charts }: { charts: UnifiedDashboardData['charts'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Case volume today</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.hourly}>
              <defs>
                <linearGradient id="dashCaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="cases" stroke="#EF4444" strokeWidth={2} fill="url(#dashCaseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Priority mix</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={charts.priorityDistribution} innerRadius={40} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none">
                {charts.priorityDistribution.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.name] || entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="md:col-span-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Today&apos;s breakdown</p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.todayBreakdown}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {charts.todayBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export function DashboardAlerts({
  criticalAlerts,
  criticalAlertText,
}: {
  criticalAlerts: any[]
  criticalAlertText: string
}) {
  const { data: notifications, isLoading } = useSWR(
    'dashboard-alerts',
    () => notificationsService.getRecent().catch(() => []),
    { refreshInterval: 15000 },
  )

  const systemAlerts = Array.isArray(notifications) ? notifications.slice(0, 5) : []

  return (
    <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar">
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Critical cases</p>
          {criticalAlerts.slice(0, 4).map((alert: any) => (
            <Link
              key={alert.id}
              href={`/admin/emergency-requests/${alert.id}`}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 hover:border-red-200 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{alert.trackingCode}</p>
                <p className="text-[10px] text-slate-500 truncate">{alert.patient?.fullName || 'Case'}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : systemAlerts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System notifications</p>
          {systemAlerts.map((n: any) => (
            <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-800 line-clamp-1">{n.title || n.message}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message || n.body}</p>
            </div>
          ))}
        </div>
      ) : criticalAlerts.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-medium">No active alerts</p>
        </div>
      ) : null}

      {criticalAlertText && (
        <p className="text-[10px] text-red-600/80 line-clamp-2 pt-1 border-t border-slate-100">{criticalAlertText}</p>
      )}

      <Link
        href="/admin/notifications?tab=critical"
        className="flex items-center justify-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 pt-1"
      >
        All alerts <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

export function DashboardResourceStatus({
  charts,
  ambulances,
}: {
  charts: UnifiedDashboardData['charts']
  ambulances: Ambulance[]
}) {
  const available = ambulances.filter((a) => a.status === 'AVAILABLE').slice(0, 4)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {charts.ambulanceStatus.slice(0, 4).map((s) => (
          <div key={s.name} className="rounded-lg p-2 text-center" style={{ backgroundColor: `${s.color}15` }}>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase">{s.name}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase">Ready units</p>
      {available.length === 0 ? (
        <p className="text-xs text-slate-500">All units deployed</p>
      ) : (
        <ul className="space-y-1">
          {available.map((a) => (
            <li key={a.id} className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {a.ambulanceNumber}
            </li>
          ))}
        </ul>
      )}
      <Link href="/admin/ambulances/availability" className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
        Fleet view <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

export function DashboardHospitalStatus({ hospitals }: { hospitals: UnifiedDashboardData['hospitals'] }) {
  const list = hospitals ?? []
  const available = list.filter((h) => ['Available', 'Limited Capacity'].includes(h.availabilityStatus)).length
  const full = list.filter((h) => h.availabilityStatus === 'Full Capacity').length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2 bg-teal-50 text-center">
          <p className="text-lg font-black text-teal-700">{available}</p>
          <p className="text-[9px] font-bold text-teal-600 uppercase">Available</p>
        </div>
        <div className="rounded-lg p-2 bg-orange-50 text-center">
          <p className="text-lg font-black text-orange-700">{full}</p>
          <p className="text-[9px] font-bold text-orange-600 uppercase">Full</p>
        </div>
      </div>
      <ul className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
        {list.slice(0, 6).map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 truncate">{h.name}</span>
            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
              h.availabilityStatus === 'Available' ? 'bg-emerald-100 text-emerald-700' :
              h.availabilityStatus === 'Full Capacity' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {h.availabilityStatus === 'Available' ? 'Open' : h.availabilityStatus === 'Full Capacity' ? 'Full' : 'Limited'}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/admin/hospitals" className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
        All hospitals <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

export function DashboardStaffStatus({ employees, summary }: { employees: Employee[]; summary: UnifiedDashboardData['summary'] }) {
  const onShift = employees.filter((e) => e.shiftStatus && e.shiftStatus !== 'OFF_DUTY').slice(0, 8)
  const drivers = onShift.filter((e) => e.employeeRole?.name?.toLowerCase().includes('driver')).length
  const nurses = onShift.filter((e) => e.employeeRole?.name?.toLowerCase().includes('nurse')).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2 bg-indigo-50 text-center">
          <p className="text-lg font-black text-indigo-700">{summary.availableCrew}</p>
          <p className="text-[9px] font-bold text-indigo-600 uppercase">Avail.</p>
        </div>
        <div className="rounded-lg p-2 bg-violet-50 text-center">
          <p className="text-lg font-black text-violet-700">{drivers}</p>
          <p className="text-[9px] font-bold text-violet-600 uppercase">Drivers</p>
        </div>
        <div className="rounded-lg p-2 bg-purple-50 text-center">
          <p className="text-lg font-black text-purple-700">{nurses}</p>
          <p className="text-[9px] font-bold text-purple-600 uppercase">Nurses</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {onShift.map((e) => (
          <span key={e.id} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            {e.firstName?.[0]}{e.lastName?.[0]}
          </span>
        ))}
      </div>
      <Link href="/admin/drivers/availability" className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
        Crew status <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

export function DashboardQuickActions({ summary }: { summary: UnifiedDashboardData['summary'] }) {
  const actions = [
    { href: '/admin/emergency-requests/new', label: 'New Case', icon: Plus, primary: true },
    { href: '/admin/emergency-requests/pending', label: 'Pending', icon: Clock, badge: summary.pendingCases },
    { href: '/admin/emergency-requests/critical', label: 'Critical', icon: AlertTriangle, badge: summary.criticalCases },
    { href: '/admin/dispatch-management', label: 'Dispatch', icon: Radio },
    { href: '/admin/assignment-board', label: 'Assign Board', icon: LayoutGrid },
    { href: '/admin/dispatch-management/readiness', label: 'Readiness', icon: Zap },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-colors ${
            action.primary
              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
              : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-red-200 hover:bg-red-50/50'
          }`}
        >
          <action.icon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{action.label}</span>
          {'badge' in action && action.badge != null && action.badge > 0 && (
            <span className={`ml-auto text-[10px] px-1.5 rounded-full ${action.primary ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
              {action.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

export function DashboardTodaySummary({ summary, charts }: { summary: UnifiedDashboardData['summary']; charts: UnifiedDashboardData['charts'] }) {
  const todayTotal = charts.hourly.reduce((s, h) => s + h.cases, 0)

  const rows = [
    { label: 'Cases today', value: todayTotal },
    { label: 'Completed', value: summary.completedCasesToday },
    { label: 'Cancelled', value: summary.cancelledToday },
    { label: 'Delayed', value: summary.delayedCases },
    { label: 'High priority', value: summary.highPriority },
  ]

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">{row.label}</span>
          <span className="font-black text-slate-900">{row.value}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Today
        </span>
        <Link href="/admin/reports" className="text-[10px] font-bold text-red-600">Reports →</Link>
      </div>
    </div>
  )
}
