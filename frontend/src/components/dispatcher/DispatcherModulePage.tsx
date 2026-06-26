'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  getModuleById,
  getNavItem,
  EMERGENCY_VIEW_API,
  HOSPITAL_VIEW_API,
  RESOURCE_VIEW_API,
  MONITORING_VIEW_API,
  ALERTS_VIEW_API,
  type DispatcherModuleId,
} from '@/lib/dispatcher/navigation'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { usePermissions } from '@/lib/hooks/usePermissions'
import DispatcherModuleShell, {
  DispatcherPanel,
  EmergencyTable,
  AmbulanceGrid,
  CrewGrid,
  HospitalGrid,
  PlaceholderView,
} from '@/components/dispatcher/DispatcherModuleShell'
import AssignModal from '@/components/features/emergency/AssignModal'
import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'
import toast from 'react-hot-toast'

async function fetchModuleData(moduleId: DispatcherModuleId, view: string) {
  switch (moduleId) {
    case 'emergency': {
      const apiView = EMERGENCY_VIEW_API[view] ?? 'all-cases'
      return dispatcherDashboardApi.getEmergencies(apiView)
    }
    case 'resources': {
      if (view === 'ambulances') {
        return dispatcherDashboardApi.getAmbulances(RESOURCE_VIEW_API.ambulances ?? 'all')
      }
      if (view === 'drivers' || view === 'nurses') {
        const crew = await dispatcherDashboardApi.getCrew(RESOURCE_VIEW_API[view] ?? view)
        if (view === 'nurses') {
          const [directory, capacity] = await Promise.all([
            dispatcherDashboardApi.getHospitals('directory'),
            dispatcherDashboardApi.getHospitals('capacity'),
          ])
          return {
            ...crew,
            hospitals: directory?.items ?? [],
            hospitalCapacity: capacity?.items ?? [],
          }
        }
        return crew
      }
      if (view === 'availability') {
        const [crew, ambulances] = await Promise.all([
          dispatcherDashboardApi.getCrew('available'),
          dispatcherDashboardApi.getAmbulances('available'),
        ])
        return {
          items: [...(crew.items ?? []), ...(ambulances.items ?? [])],
          crew,
          ambulances,
        }
      }
      return { items: [] }
    }
    case 'hospital': {
      if (view === 'incoming' || view === 'handover' || view === 'decisions') {
        const apiView = HOSPITAL_VIEW_API[view] ?? view
        return dispatcherDashboardApi.getEmergencies(apiView)
      }
      const apiView = HOSPITAL_VIEW_API[view] ?? 'directory'
      return dispatcherDashboardApi.getHospitals(apiView)
    }
    case 'monitoring': {
      const apiView = MONITORING_VIEW_API[view] ?? 'mission-monitor'
      if (apiView === 'mission-monitor' || view === 'missions') {
        const missions = await dispatcherDashboardApi.getActiveMissions()
        const items = Array.isArray(missions) ? missions : (missions as { items?: unknown[] })?.items ?? []
        return { items, view }
      }
      if (apiView === 'timeline') {
        return dispatcherDashboardApi.getEmergencies('timeline')
      }
      if (apiView === 'unit-board') {
        return dispatcherDashboardApi.getAmbulances('all')
      }
      if (apiView === 'high-priority') {
        return dispatcherDashboardApi.getEmergencies('critical')
      }
      return dispatcherDashboardApi.getOverview()
    }
    case 'alerts': {
      const apiView = ALERTS_VIEW_API[view] ?? 'critical'
      return dispatcherDashboardApi.getAlertsFeed(apiView)
    }
    case 'reports':
      return dispatcherDashboardApi.getOverview()
    case 'permissions':
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
  const { hasGrantedPermission, grantedKeys } = usePermissions()
  const canCreateDriver = hasGrantedPermission('driver.create')
  const [assignTarget, setAssignTarget] = useState<any>(null)

  const { data, isLoading, mutate } = useSWR(
    module && navItem ? `dispatcher-${moduleId}-${view}` : null,
    () => fetchModuleData(moduleId, view),
    { refreshInterval: 15000 },
  )

  if (!module || module.id === 'dashboard' || module.id === 'profile' || !navItem) notFound()

  const items = (data as any)?.items ?? []
  const statusLogs = (data as any)?.statusLogs ?? []
  const overview = data as any

  const renderContent = () => {
    if (moduleId === 'permissions') {
      return (
        <DispatcherPanel title="My Permissions">
          <PortalPermissionsView portal="dispatcher" />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'emergency') {
      if (view === 'timeline') {
        return (
          <DispatcherPanel title="Mission Timeline" empty={!statusLogs.length ? 'No status logs yet' : undefined}>
            <div className="space-y-2">
              {statusLogs.map((log: any) => (
                <div key={log.id} className="text-sm border-b border-gray-50 pb-2">
                  <span className="font-bold">{log.emergencyRequest?.trackingCode}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {log.fromStatus ?? 'NEW'} → {log.toStatus}
                  </span>
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
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No cases in this queue' : undefined}>
          <div className="flex justify-end mb-3">
            <Link
              href="/dispatcher/new-emergency"
              className="text-xs font-bold text-red-600 hover:underline"
            >
              + Create Emergency Case
            </Link>
          </div>
          <EmergencyTable items={items} onAssign={canOperate ? (r) => setAssignTarget(r) : undefined} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'resources') {
      if (view === 'availability') {
        const ambItems = (data as any)?.ambulances?.items ?? []
        const crewItems = (data as any)?.crew?.items ?? []
        return (
          <DispatcherPanel title="Availability Board">
            <p className="text-[10px] font-bold uppercase text-emerald-600 mb-2">Available ambulances ({ambItems.length})</p>
            <AmbulanceGrid items={ambItems} />
            <p className="text-[10px] font-bold uppercase text-blue-600 mt-4 mb-2">Available crew ({crewItems.length})</p>
            <CrewGrid items={crewItems} />
          </DispatcherPanel>
        )
      }
      if (view === 'ambulances') {
        return (
          <DispatcherPanel title={navItem.label} empty={!items.length ? 'No ambulances in this category' : undefined}>
            <AmbulanceGrid items={items} />
          </DispatcherPanel>
        )
      }
      if (view === 'nurses') {
        const hospitalItems = (data as any)?.hospitals ?? []
        const capacityItems = (data as any)?.hospitalCapacity ?? []
        const hospitals = hospitalItems.length ? hospitalItems : capacityItems
        return (
          <DispatcherPanel title="Nurse & Hospital Resources">
            <p className="text-[10px] font-bold uppercase text-blue-600 mb-2">
              Nurses ({items.length})
            </p>
            {items.length ? (
              <CrewGrid items={items} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No nurses found</p>
            )}
            <p className="text-[10px] font-bold uppercase text-emerald-600 mt-6 mb-2">
              Hospitals ({hospitals.length})
            </p>
            {hospitals.length ? (
              <HospitalGrid items={hospitals} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No hospitals found</p>
            )}
          </DispatcherPanel>
        )
      }
      return (
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No crew members found' : undefined}>
          {view === 'drivers' && canCreateDriver && (
            <div className="flex justify-end mb-3">
              <Link
                href="/dispatcher/add-driver"
                className="inline-flex items-center text-xs font-bold text-red-600 hover:underline"
              >
                + Add Driver
              </Link>
            </div>
          )}
          <CrewGrid items={items} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'hospital') {
      if (view === 'incoming' || view === 'handover' || view === 'decisions') {
        return (
          <DispatcherPanel title={navItem.label} empty={!items.length ? 'No cases in this queue' : undefined}>
            <EmergencyTable items={items} onAssign={canOperate ? (r) => setAssignTarget(r) : undefined} />
          </DispatcherPanel>
        )
      }
      return (
        <DispatcherPanel title={navItem.label} empty={!items.length ? 'No hospitals found' : undefined}>
          <HospitalGrid items={items} />
        </DispatcherPanel>
      )
    }

    if (moduleId === 'alerts') {
      const alertItems = Array.isArray(items) ? items : []
      if (!alertItems.length) {
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
                {a.name || a.title || a.trackingCode || JSON.stringify(a).slice(0, 80)}
              </li>
            ))}
          </ul>
        </DispatcherPanel>
      )
    }

    if (moduleId === 'monitoring') {
      if (view === 'missions') {
        return (
          <DispatcherPanel title="Active Missions" empty={!items.length ? 'No active missions' : undefined}>
            <EmergencyTable items={items} />
          </DispatcherPanel>
        )
      }
      if (view === 'timeline') {
        return (
          <DispatcherPanel title="Mission Timeline" empty={!statusLogs.length ? 'No timeline entries' : undefined}>
            <div className="space-y-2">
              {statusLogs.map((log: any) => (
                <div key={log.id} className="text-sm border-b border-gray-50 pb-2">
                  <span className="font-bold">{log.emergencyRequest?.trackingCode}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {log.fromStatus ?? 'NEW'} → {log.toStatus}
                  </span>
                </div>
              ))}
            </div>
          </DispatcherPanel>
        )
      }
      if (view === 'resources') {
        return (
          <DispatcherPanel title="Resource Status">
            <AmbulanceGrid items={items} />
          </DispatcherPanel>
        )
      }
      if (view === 'incidents') {
        return (
          <DispatcherPanel title="Incident Monitoring" empty={!items.length ? 'No escalated incidents' : undefined}>
            <EmergencyTable items={items} />
          </DispatcherPanel>
        )
      }
    }

    if (moduleId === 'reports' && overview?.kpis) {
      const k = overview.kpis
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Total Emergencies', k.liveEmergencyCases],
            ['Completed Today', k.todayCompletedMissions],
            ['Avg Response (min)', k.averageResponseTimeMinutes ?? '—'],
            ['Delayed Missions', k.delayedMissions],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-black text-gray-900">{val}</p>
              <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>
      )
    }

    return <PlaceholderView title={navItem.label} />
  }

  return (
    <DispatcherModuleShell module={module} description={module.description}>
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
