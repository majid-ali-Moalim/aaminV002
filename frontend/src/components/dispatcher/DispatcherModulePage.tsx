'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
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
import DispatcherCaseAlerts from '@/components/dispatcher/DispatcherCaseAlerts'
import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'
import {
  AmbulanceAvailabilityView,
  DriverAvailabilityView,
  NurseAvailabilityView,
  ResourceStatusView,
} from '@/components/dispatcher/DispatcherResourceViews'
import toast from 'react-hot-toast'

async function fetchModuleData(moduleId: DispatcherModuleId, view: string) {
  switch (moduleId) {
    case 'emergency': {
      const apiView = EMERGENCY_VIEW_API[view] ?? 'all-cases'
      return dispatcherDashboardApi.getEmergencies(apiView)
    }
    case 'resources': {
      if (view === 'ambulance-availability') {
        const [all, available, busy, maintenance] = await Promise.all([
          dispatcherDashboardApi.getAmbulances('all'),
          dispatcherDashboardApi.getAmbulances('available'),
          dispatcherDashboardApi.getAmbulances('busy'),
          dispatcherDashboardApi.getAmbulances('maintenance'),
        ])
        return { items: available.items ?? [], all, available, busy, maintenance, region: available.region, stations: available.stations ?? [], homeStationId: available.homeStationId }
      }
      if (view === 'driver-availability') {
        const [all, available, onMission, offDuty] = await Promise.all([
          dispatcherDashboardApi.getCrew('drivers'),
          dispatcherDashboardApi.getCrew('drivers-available'),
          dispatcherDashboardApi.getCrew('on-mission'),
          dispatcherDashboardApi.getCrew('off-duty'),
        ])
        const drivers = (all.items ?? []).filter((e: any) =>
          String(e.employeeRole?.name ?? '').toLowerCase().includes('driver'),
        )
        const availDrivers = (available.items ?? []).filter((e: any) =>
          String(e.employeeRole?.name ?? '').toLowerCase().includes('driver'),
        )
        return {
          items: availDrivers,
          onMission: onMission,
          stats: {
            total: drivers.length,
            available: availDrivers.length,
            onMission: (onMission.items ?? []).filter((e: any) =>
              String(e.employeeRole?.name ?? '').toLowerCase().includes('driver'),
            ).length,
            offDuty: (offDuty.items ?? []).filter((e: any) =>
              String(e.employeeRole?.name ?? '').toLowerCase().includes('driver'),
            ).length,
          },
          region: available.region,
          stations: available.stations ?? [],
          homeStationId: available.homeStationId,
        }
      }
      if (view === 'nurse-availability') {
        const [all, available, onMission, offDuty] = await Promise.all([
          dispatcherDashboardApi.getCrew('nurses'),
          dispatcherDashboardApi.getCrew('nurses-available'),
          dispatcherDashboardApi.getCrew('on-mission'),
          dispatcherDashboardApi.getCrew('off-duty'),
        ])
        const nurses = all.items ?? []
        const availNurses = available.items ?? []
        return {
          items: availNurses,
          onMission,
          stats: {
            total: nurses.length,
            available: availNurses.length,
            onMission: (onMission.items ?? []).filter((e: any) =>
              String(e.employeeRole?.name ?? '').toLowerCase().includes('nurse'),
            ).length,
            offDuty: (offDuty.items ?? []).filter((e: any) =>
              String(e.employeeRole?.name ?? '').toLowerCase().includes('nurse'),
            ).length,
          },
          region: available.region,
          stations: available.stations ?? [],
          homeStationId: available.homeStationId,
        }
      }
      if (view === 'resource-status') {
        const [ambulances, drivers, nurses] = await Promise.all([
          dispatcherDashboardApi.getAmbulances('all'),
          dispatcherDashboardApi.getCrew('drivers'),
          dispatcherDashboardApi.getCrew('nurses'),
        ])
        return {
          ambulances: ambulances.items ?? [],
          drivers: drivers.items ?? [],
          nurses: nurses.items ?? [],
          region: ambulances.region ?? drivers.region,
          stations: ambulances.stations ?? drivers.stations ?? [],
          homeStationId: ambulances.homeStationId ?? drivers.homeStationId,
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
      return dispatcherDashboardApi.getNotifications(view === 'all' ? 'all' : view)
    }
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

  const { data, isLoading, isValidating, mutate } = useSWR(
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
          {(overview?.region) && (
            <p className="text-xs text-gray-500 mb-3">
              {view === 'pending-dispatch' || view === 'dispatch-board'
                ? `Unassigned cases in your region · ${overview.region}`
                : `Cases you handle · ${overview.region}`}
            </p>
          )}
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
      const regionLabel = (data as any)?.region
      const refresh = () => void mutate()

      if (view === 'ambulance-availability') {
        return (
          <AmbulanceAvailabilityView
            data={data as any}
            region={regionLabel}
            stations={(data as any)?.stations ?? []}
            homeStationId={(data as any)?.homeStationId}
            onRefresh={refresh}
            refreshing={isValidating}
          />
        )
      }

      if (view === 'driver-availability') {
        const onMissionDrivers = ((data as any)?.onMission?.items ?? []).filter((e: any) =>
          String(e.employeeRole?.name ?? '').toLowerCase().includes('driver'),
        )
        return (
          <DriverAvailabilityView
            items={items}
            onMissionItems={onMissionDrivers}
            stats={(data as any)?.stats ?? {}}
            region={regionLabel}
            stations={(data as any)?.stations ?? []}
            homeStationId={(data as any)?.homeStationId}
            onRefresh={refresh}
            refreshing={isValidating}
          />
        )
      }

      if (view === 'nurse-availability') {
        const onMissionNurses = ((data as any)?.onMission?.items ?? []).filter((e: any) =>
          String(e.employeeRole?.name ?? '').toLowerCase().includes('nurse'),
        )
        return (
          <NurseAvailabilityView
            items={items}
            onMissionItems={onMissionNurses}
            stats={(data as any)?.stats ?? {}}
            region={regionLabel}
            stations={(data as any)?.stations ?? []}
            homeStationId={(data as any)?.homeStationId}
            onRefresh={refresh}
            refreshing={isValidating}
          />
        )
      }

      if (view === 'resource-status') {
        return (
          <ResourceStatusView
            ambulances={(data as any)?.ambulances ?? []}
            drivers={(data as any)?.drivers ?? []}
            nurses={(data as any)?.nurses ?? []}
            region={regionLabel}
            stations={(data as any)?.stations ?? []}
            homeStationId={(data as any)?.homeStationId}
            onRefresh={refresh}
            refreshing={isValidating}
          />
        )
      }

      return null
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
      const alertData = data as {
        items?: unknown[]
        cases?: unknown[]
        region?: string
        unread?: number
      }
      const noteItems = alertData?.items ?? (Array.isArray(data) ? data : [])
      const caseItems = alertData?.cases ?? []

      return (
        <DispatcherPanel title={navItem.label}>
          <DispatcherCaseAlerts
            notifications={noteItems as any}
            cases={caseItems as any}
            region={alertData?.region}
            unread={alertData?.unread}
            onRefresh={() => {
              void mutate()
              void globalMutate('dispatcher-notification-stats')
            }}
          />
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

    return <PlaceholderView title={navItem.label} />
  }

  return (
    <DispatcherModuleShell
      module={module}
      description={moduleId === 'resources' ? undefined : module.description}
      hideHeader={moduleId === 'resources'}
    >
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
