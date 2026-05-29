'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { emergencyRequestsService, ambulancesService, reportsService, employeesService } from '@/lib/api'
import { OverviewMetrics } from '@/components/dashboard/OverviewMetrics'
import { LiveDispatchBoard } from '@/components/dashboard/LiveDispatchBoard'
import { EmergencyQueue } from '@/components/dashboard/EmergencyQueue'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { StaffAvailability } from '@/components/dashboard/StaffAvailability'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { Loader2, Radio, Users, Truck, ArrowRight } from 'lucide-react'

function isToday(d: string | Date | null | undefined) {
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}

function isActiveEmergency(status: string) {
  return !['COMPLETED', 'CANCELLED', 'PENDING'].includes(status)
}

function buildHourlyChart(requests: any[]) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 6)
  return hours.map((h) => {
    const count = requests.filter((r) => {
      if (!r.createdAt) return false
      return new Date(r.createdAt).getHours() === h && isToday(r.createdAt)
    }).length
    return {
      time: `${h.toString().padStart(2, '0')}:00`,
      missions: count,
    }
  })
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'analytics'>('dispatch')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetcher = async () => {
    const [statsRes, requestsRes, ambulancesRes, employeesRes] = await Promise.all([
      reportsService.getDashboardStats(),
      emergencyRequestsService.getAll(),
      ambulancesService.getAll(),
      employeesService.getAll(),
    ])
    return {
      stats: statsRes.stats,
      recentActivity: statsRes.recentActivity,
      requests: requestsRes,
      ambulances: ambulancesRes,
      employees: employeesRes,
    }
  }

  const { data, error, mutate } = useSWR('dashboard-data', fetcher, {
    refreshInterval: 8000,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over) {
      console.log('Dispatched:', active.data.current, 'to:', over.data.current)
    }
  }

  const requests = (data?.requests ?? []) as any[]
  const ambulances = (data?.ambulances ?? []) as any[]
  const employees = (data?.employees ?? []) as any[]

  const extendedKpis = useMemo(() => {
    const completed = requests.filter((r) => r.status === 'COMPLETED')
    return {
      pendingRequests: requests.filter((r) => r.status === 'PENDING').length,
      criticalCases: requests.filter((r) => r.priority === 'CRITICAL' && isActiveEmergency(r.status)).length,
      highPriority: requests.filter((r) => r.priority === 'HIGH' && isActiveEmergency(r.status)).length,
      completedToday: requests.filter((r) => r.status === 'COMPLETED' && isToday(r.completedAt || r.updatedAt)).length,
      cancelledToday: requests.filter((r) => r.status === 'CANCELLED' && isToday(r.updatedAt)).length,
      totalAmbulances: ambulances.length,
      onDutyAmbulances: ambulances.filter((a) => a.status === 'ON_DUTY' || a.status === 'DISPATCHED').length,
      activeStaff: employees.filter((e) => ['ON_DUTY', 'AVAILABLE'].includes(e.shiftStatus)).length,
      totalPatients: data?.stats?.totalPatients ?? 0,
      successRate: requests.length > 0 ? Math.round((completed.length / requests.length) * 100) : 0,
    }
  }, [requests, ambulances, employees, data?.stats])

  const criticalList = useMemo(
    () =>
      requests
        .filter((r) => r.priority === 'CRITICAL' && isActiveEmergency(r.status))
        .slice(0, 3)
        .map((r) => {
          const loc = (r.pickupLocation || 'Unknown').split(',')[0]
          return `${r.trackingCode || r.id.slice(0, 8)} (${r.patient?.fullName || 'Case'} / ${loc})`
        })
        .join(' — '),
    [requests],
  )

  const chartData = useMemo(() => buildHourlyChart(requests), [requests])

  const priorityData = useMemo(
    () => [
      { name: 'CRITICAL', value: requests.filter((r) => r.priority === 'CRITICAL').length || 0 },
      { name: 'HIGH', value: requests.filter((r) => r.priority === 'HIGH').length || 0 },
      { name: 'MEDIUM', value: requests.filter((r) => r.priority === 'MEDIUM').length || 0 },
      { name: 'LOW', value: requests.filter((r) => r.priority === 'LOW').length || 0 },
    ],
    [requests],
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl bg-white border border-red-100 p-12 text-center">
        <p className="text-red-600 font-bold">Failed to load dashboard</p>
        <p className="text-sm text-slate-500 mt-2">Check that the backend is running on port 3001.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading mission control…</p>
      </div>
    )
  }

  const dispatchContent = (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <EmergencyQueue requests={data.requests} />
        <LiveDispatchBoard ambulances={data.ambulances} />
        <StaffAvailability employees={data.employees} />
      </div>
    </DndContext>
  )

  const quickLinks = [
    { href: '/admin/emergency-requests/pending', label: 'Pending queue', icon: Radio, count: extendedKpis.pendingRequests },
    { href: '/admin/dispatchers', label: 'Dispatchers', icon: Users, count: null },
    { href: '/admin/ambulances', label: 'Fleet', icon: Truck, count: extendedKpis.totalAmbulances },
  ]

  return (
    <div className="min-h-screen -m-6 p-6 bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      <OverviewMetrics
        stats={data.stats}
        chartData={chartData}
        priorityData={priorityData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dispatchContent={dispatchContent}
        extendedKpis={extendedKpis}
        criticalAlertText={criticalList}
      />

      {/* Quick access strip */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <link.icon className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm font-bold text-slate-800">{link.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {link.count != null && (
                <span className="text-lg font-black text-red-600">{link.count}</span>
              )}
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <ActivityFeed activities={data.recentActivity || []} />
      </div>
    </div>
  )
}
