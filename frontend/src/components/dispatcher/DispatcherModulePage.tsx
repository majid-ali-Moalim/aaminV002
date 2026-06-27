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
      if (view === 'ambulance-availability') {
        const [all, available, busy, maintenance] = await Promise.all([
          dispatcherDashboardApi.getAmbulances('all'),
          dispatcherDashboardApi.getAmbulances('available'),
          dispatcherDashboardApi.getAmbulances('busy'),
          dispatcherDashboardApi.getAmbulances('maintenance'),
        ])
        return { items: available.items ?? [], all, available, busy, maintenance, region: available.region }
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
        }
      }
      if (view === 'hospital-availability') {
        const [capacity, directory] = await Promise.all([
          dispatcherDashboardApi.getHospitals('capacity'),
          dispatcherDashboardApi.getHospitals('directory'),
        ])
        const items = capacity.items ?? []
        return {
          items,
          hospitals: directory.items ?? [],
          stats: {
            total: (directory.items ?? []).length,
            receiving: items.filter((h: any) => h.erReady || h.acceptEmergencyCases).length,
            full: items.filter((h: any) => ['Full', 'Overcapacity'].includes(h.status)).length,
            icu: items.filter((h: any) => (h.icuTotalBeds ?? 0) > 0).length,
          },
          region: capacity.region,
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
    case 'reports': {
      const reportType = view || 'emergency'
      return dispatcherDashboardApi.getReports(reportType)
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
          {(overview?.region) && (
            <p className="text-xs text-gray-500 mb-3">Regional cases · {overview.region}</p>
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
      const regionLabel = (data as any)?.region ? ` · ${(data as any).region}` : ''

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

      if (view === 'ambulance-availability') {
        const avail = (data as any)?.available?.items ?? items
        const busyItems = (data as any)?.busy?.items ?? []
        const maintItems = (data as any)?.maintenance?.items ?? []
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Regional ambulance fleet{regionLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Available', avail.length, 'text-emerald-600'],
                ['On Duty', busyItems.length, 'text-amber-600'],
                ['Maintenance', maintItems.length, 'text-orange-600'],
                ['Total', ((data as any)?.all?.items ?? []).length, 'text-gray-700'],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
                </div>
              ))}
            </div>
            <DispatcherPanel title="Available Ambulances" empty={!avail.length ? 'No ambulances available' : undefined}>
              <AmbulanceGrid items={avail} />
            </DispatcherPanel>
            {busyItems.length > 0 && (
              <DispatcherPanel title="On Duty">
                <AmbulanceGrid items={busyItems} />
              </DispatcherPanel>
            )}
          </div>
        )
      }

      if (view === 'driver-availability') {
        const stats = (data as any)?.stats ?? {}
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Regional driver availability{regionLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Available', stats.available ?? items.length],
                ['On Mission', stats.onMission ?? 0],
                ['Off Duty', stats.offDuty ?? 0],
                ['Total', stats.total ?? items.length],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-2xl font-black text-blue-600">{val}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
                </div>
              ))}
            </div>
            <DispatcherPanel title="Available Drivers" empty={!items.length ? 'No drivers available' : undefined}>
              <CrewGrid items={items} />
            </DispatcherPanel>
          </div>
        )
      }

      if (view === 'nurse-availability') {
        const stats = (data as any)?.stats ?? {}
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Regional nurse availability{regionLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Available', stats.available ?? items.length],
                ['On Mission', stats.onMission ?? 0],
                ['Off Duty', stats.offDuty ?? 0],
                ['Total', stats.total ?? items.length],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-2xl font-black text-emerald-600">{val}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
                </div>
              ))}
            </div>
            <DispatcherPanel title="Available Nurses" empty={!items.length ? 'No nurses available' : undefined}>
              <CrewGrid items={items} />
            </DispatcherPanel>
          </div>
        )
      }

      if (view === 'hospital-availability') {
        const stats = (data as any)?.stats ?? {}
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Regional hospital capacity{regionLabel}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['Hospitals', stats.total ?? items.length],
                ['Receiving', stats.receiving ?? 0],
                ['At Capacity', stats.full ?? 0],
                ['With ICU', stats.icu ?? 0],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <p className="text-2xl font-black text-gray-900">{val}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
                </div>
              ))}
            </div>
            <DispatcherPanel title="Hospital Capacity" empty={!items.length ? 'No hospitals in your region' : undefined}>
              <HospitalGrid items={items} />
            </DispatcherPanel>
          </div>
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

    if (moduleId === 'reports' && overview?.summary) {
      const s = overview.summary
      const cases = overview.cases ?? []
      const breakdown = overview.statusBreakdown ?? []
      return (
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            Reports for cases you handle
            {overview.region ? ` · ${overview.region}` : ''}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['My Cases', s.totalCases],
              ['Completed Today', s.completedToday],
              ['Avg Response (min)', s.avgResponseMinutes ?? '—'],
              ['Active Cases', s.activeCases],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-black text-gray-900">{val}</p>
                <p className="text-xs font-bold text-gray-500 uppercase mt-1">{label}</p>
              </div>
            ))}
          </div>
          {breakdown.length > 0 && (
            <DispatcherPanel title="Status Breakdown">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {breakdown.map((b: any) => (
                  <div key={b.status} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{b.count}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{b.status}</p>
                  </div>
                ))}
              </div>
            </DispatcherPanel>
          )}
          <DispatcherPanel title="Case Report Data" empty={!cases.length ? 'No cases in your scope' : undefined}>
            <EmergencyTable items={cases} />
          </DispatcherPanel>
          {(overview.attendance?.length ?? 0) > 0 && (
            <DispatcherPanel title="Regional Crew Attendance">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 border-b">
                      <th className="py-2">Staff</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.attendance.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-2">{a.employee?.firstName} {a.employee?.lastName}</td>
                        <td className="py-2">{a.employee?.employeeRole?.name}</td>
                        <td className="py-2">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="py-2">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DispatcherPanel>
          )}
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
