'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  getModuleById,
  getNavItem,
  type DispatcherModuleId,
} from '@/lib/dispatcher/navigation'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import DispatcherModuleShell, {
  DispatcherPanel,
  EmergencyTable,
  AmbulanceGrid,
  CrewGrid,
  HospitalGrid,
  PlaceholderView,
} from '@/components/dispatcher/DispatcherModuleShell'
import AssignModal from '@/components/features/emergency/AssignModal'
import toast from 'react-hot-toast'

const MODULE_DESCRIPTIONS: Partial<Record<DispatcherModuleId, string>> = {
  operations: 'Receive emergencies, assign ambulances, and monitor the full mission lifecycle.',
  ambulances: 'Fleet readiness, unit status, maintenance, and ambulance performance.',
  crew: 'Drivers, nurses, paramedics — availability, shifts, and assignments.',
  communications: 'Coordinate with crews, hospitals, and broadcast emergency messages.',
  hospital: 'Hospital capacity, bed availability, and patient destination coordination.',
  tracking: 'Live GPS tracking, mission monitoring, and route oversight.',
  incidents: 'High-priority, escalated, and failed dispatch incident monitoring.',
  reports: 'Operational analytics, response times, and exportable reports.',
  alerts: 'System-wide critical alerts and operational warnings.',
  tools: 'Quick dispatch utilities, notes, filters, and dispatcher settings.',
}

async function fetchModuleData(moduleId: DispatcherModuleId, view: string) {
  switch (moduleId) {
    case 'operations':
      if (view === 'public-tracking') return { items: [] }
      if (view === 'new-case') return { items: [] }
      return dispatcherDashboardApi.getEmergencies(view)
    case 'ambulances':
      return dispatcherDashboardApi.getAmbulances(view)
    case 'crew':
      return dispatcherDashboardApi.getCrew(view)
    case 'hospital':
      return dispatcherDashboardApi.getHospitals(view)
    case 'alerts':
      return dispatcherDashboardApi.getAlertsFeed(view)
    case 'tracking':
      if (view === 'live-map' || view === 'mission-monitor' || view === 'delayed') {
        const [missions, fleet] = await Promise.all([
          dispatcherDashboardApi.getActiveMissions(),
          dispatcherDashboardApi.getFleet(),
        ])
        return { items: missions, fleet, view }
      }
      if (view === 'unit-board') return dispatcherDashboardApi.getAmbulances('all')
      if (view === 'case-tracking') return dispatcherDashboardApi.getEmergencies('all-cases')
      if (view === 'timeline' || view === 'activity') {
        return dispatcherDashboardApi.getEmergencies('timeline')
      }
      return dispatcherDashboardApi.getOverview()
    case 'incidents':
      if (view === 'logs') {
        const cases = await dispatcherDashboardApi.getMyCases()
        return { items: Array.isArray(cases) ? cases : [] }
      }
      if (view === 'high-priority') return dispatcherDashboardApi.getEmergencies('critical')
      if (view === 'escalated' || view === 'response-delays')
        return dispatcherDashboardApi.getEmergencies('escalated')
      if (view === 'failed-dispatch') return dispatcherDashboardApi.getEmergencies('cancelled')
      return dispatcherDashboardApi.getAlertsFeed('critical')
    case 'reports':
      return dispatcherDashboardApi.getOverview()
    case 'communications':
      return dispatcherDashboardApi.getOverview()
    case 'tools':
      if (view === 'quick-dispatch') return dispatcherDashboardApi.getPendingQueue()
      if (view === 'activity' || view === 'audit') return dispatcherDashboardApi.getOverview()
      return { items: [] }
    default:
      return { items: [] }
  }
}

export default function DispatcherModulePage({
  moduleId,
  view,
}: {
  moduleId: DispatcherModuleId
  view: string
}) {
  const module = getModuleById(moduleId)
  const navItem = module ? getNavItem(module, view) : undefined
  const { canOperate } = useDispatcherAccess()
  const [assignTarget, setAssignTarget] = useState<any>(null)

  const { data, isLoading, mutate } = useSWR(
    module && navItem ? `dispatcher-${moduleId}-${view}` : null,
    () => fetchModuleData(moduleId, view),
    { refreshInterval: 15000 },
  )

  if (!module || module.id === 'dashboard' || !navItem) notFound()

  const items = (data as any)?.items ?? []
  const statusLogs = (data as any)?.statusLogs ?? []
  const overview = data as any

  const renderContent = () => {
    if (moduleId === 'operations') {
      if (view === 'new-case') {
        return (
          <DispatcherPanel title="Register New Emergency">
            <p className="text-sm text-gray-600 mb-4">
              Create a new emergency case for dispatch assignment.
            </p>
            <Link
              href="/admin/emergency-requests/new"
              className="inline-flex px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold"
            >
              Open New Case Form →
            </Link>
          </DispatcherPanel>
        )
      }
      if (view === 'public-tracking') {
        return (
          <DispatcherPanel title="Public Tracking">
            <p className="text-sm text-gray-600 mb-4">Share tracking links with callers and families.</p>
            <Link href="/track" className="text-red-600 font-bold text-sm">
              Open public tracking portal →
            </Link>
          </DispatcherPanel>
        )
      }
      if (view === 'timeline') {
        return (
          <DispatcherPanel title="Mission Timeline & Logs" empty={!statusLogs.length ? 'No status logs yet' : undefined}>
            <div className="space-y-2">
              {statusLogs.map((log: any) => (
                <div key={log.id} className="text-sm border-b border-gray-50 pb-2">
                  <span className="font-bold">{log.emergencyRequest?.trackingCode}</span>
                  <span className="text-gray-500"> · {log.fromStatus ?? 'NEW'} → {log.toStatus}</span>
                  <span className="text-xs text-gray-400 block">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </DispatcherPanel>
        )
      }
      return (
        <DispatcherPanel
          title={navItem.label}
          empty={!items.length ? 'No cases in this queue' : undefined}
        >
          <EmergencyTable
            items={items}
            onAssign={canOperate ? (r) => setAssignTarget(r) : undefined}
          />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'ambulances') {
      if (['inspections', 'assignment-history', 'performance'].includes(view)) {
        return <PlaceholderView title={navItem.label} />
      }
      return (
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No ambulances in this category' : undefined}>
          <AmbulanceGrid items={items} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'crew') {
      if (['shifts', 'assignments', 'attendance', 'certifications', 'performance'].includes(view)) {
        return <PlaceholderView title={navItem.label} />
      }
      return (
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No crew members found' : undefined}>
          <CrewGrid items={items} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'hospital') {
      if (['destinations', 'handover-logs', 'comm-logs'].includes(view)) {
        return <PlaceholderView title={navItem.label} />
      }
      return (
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No hospitals found' : undefined}>
          <HospitalGrid items={items} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'alerts' || moduleId === 'incidents') {
      const alertItems = Array.isArray(items) ? items : []
      if (!alertItems.length && !items?.trackingCode) {
        return <DispatcherPanel title={navItem.label} empty="No alerts in this category" />
      }
      if (alertItems[0]?.trackingCode) {
        return (
          <DispatcherPanel title={navItem.label}>
            <EmergencyTable items={alertItems} />
          </DispatcherPanel>
        )
      }
      return (
        <DispatcherPanel title={navItem.label}>
          <ul className="space-y-2 text-sm">
            {alertItems.map((a: any, i: number) => (
              <li key={a.id ?? i} className="p-3 bg-gray-50 rounded-lg">
                {a.name || a.title || JSON.stringify(a).slice(0, 80)}
              </li>
            ))}
          </ul>
        </DispatcherPanel>
      )
    }

    if (moduleId === 'tracking') {
      if (view === 'live-map') {
        return (
          <DispatcherPanel title="Live Ambulance Tracking">
            <p className="text-sm text-gray-500 mb-4">Fleet snapshot — map integration layer.</p>
            <AmbulanceGrid items={(data as any)?.fleet ?? []} />
          </DispatcherPanel>
        )
      }
      if (view === 'mission-monitor' || view === 'delayed') {
        const list = view === 'delayed' ? overview?.delayedMissions : items
        return (
          <DispatcherPanel title={navItem.label} empty={!list?.length ? 'No missions' : undefined}>
            <EmergencyTable items={list ?? []} />
          </DispatcherPanel>
        )
      }
      if (view === 'unit-board') {
        return (
          <DispatcherPanel title="Unit Status Board">
            <AmbulanceGrid items={items} />
          </DispatcherPanel>
        )
      }
      if (overview?.kpis) {
        return (
          <DispatcherPanel title={navItem.label}>
            <EmergencyTable items={overview.liveCases ?? []} />
          </DispatcherPanel>
        )
      }
    }

    if (moduleId === 'reports' && overview?.kpis) {
      const k = overview.kpis
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Active Missions', k.activeMissions],
            ['Completed Today', k.todayCompletedMissions],
            ['Avg Response (min)', k.averageResponseTimeMinutes ?? '—'],
            ['Delayed', k.delayedMissions],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-black text-gray-900">{val}</p>
              <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>
      )
    }

    if (moduleId === 'communications') {
      return (
        <PlaceholderView
          title={navItem.label}
          hint="Communication channels connect dispatchers with ambulance crews, field staff, and hospital coordinators. Use the contacts below for immediate coordination."
        />
      )
    }

    if (moduleId === 'tools') {
      if (view === 'quick-dispatch') {
        return (
          <DispatcherPanel title="Quick Dispatch" empty={!items.length ? 'Queue is clear' : undefined}>
            <EmergencyTable
              items={items}
              onAssign={canOperate ? (r) => setAssignTarget(r) : undefined}
            />
          </DispatcherPanel>
        )
      }
      if (view === 'settings') {
        return (
          <DispatcherPanel title="Dispatcher Settings">
            <Link href="/dispatcher/profile" className="text-red-600 font-bold text-sm">
              Edit profile & contact details →
            </Link>
          </DispatcherPanel>
        )
      }
      if (view === 'activity' && overview?.activityFeed) {
        return (
          <DispatcherPanel title="Activity Logs">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {overview.activityFeed.map((a: any) => (
                <div key={a.id} className="text-sm border-b border-gray-50 pb-2">
                  <span className="font-bold">{a.title}</span>
                  <span className="text-gray-500"> — {a.message}</span>
                </div>
              ))}
            </div>
          </DispatcherPanel>
        )
      }
      return <PlaceholderView title={navItem.label} />
    }

    return <PlaceholderView title={navItem.label} />
  }

  return (
    <DispatcherModuleShell module={module} description={MODULE_DESCRIPTIONS[moduleId]}>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      ) : (
        renderContent()
      )}

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => {
            setAssignTarget(null)
            toast.success('Unit assigned')
            mutate()
          }}
        />
      )}
    </DispatcherModuleShell>
  )
}
