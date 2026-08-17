'use client'

import '../active-missions.css'
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Siren,
  Truck,
  MapPin,
  RefreshCw,
  Search,
  Activity,
  Building2,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import CaseDetailModal from '@/components/features/emergency/CaseDetailModal'
import CompleteCaseModal from '@/components/features/emergency/CompleteCaseModal'
import CancelModal from '@/components/features/emergency/CancelModal'
import AssignHospitalModal from '@/components/features/emergency/AssignHospitalModal'
import AssignModal from '@/components/features/emergency/AssignModal'
import { CLOSED_EMERGENCY_STATUSES } from '@/lib/emergency/dateFilters'
import { useFocusedCaseFromUrl } from '@/components/features/emergency/useFocusedCaseFromUrl'
import {
  ACTIVE_MISSION_STATUSES,
  SIMPLE_MISSION_PHASE_FILTERS,
  matchesSimpleMissionPhaseFilter,
  simpleActiveCaseStatus,
  type SimpleMissionPhaseFilter,
} from '@/components/features/emergency/missionStatusOptions'
import { useEmergencyPaths } from '@/lib/emergency/EmergencyPortalContext'
import { useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests, type DispatcherActiveScope } from '@/lib/emergency/fetchEmergencyRequests'

function SimpleStatusPill({ status }: { status: string }) {
  const label = simpleActiveCaseStatus(status)
  const tone =
    status === 'ASSIGNED'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : status === 'ARRIVED_HOSPITAL'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : status === 'COMPLETED'
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-red-50 text-red-800 border-red-200'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  )
}

function crewLine(request: EmergencyRequest): string {
  const parts: string[] = []
  if (request.ambulance?.ambulanceNumber) parts.push(request.ambulance.ambulanceNumber)
  if (request.driver) {
    parts.push(`${request.driver.firstName ?? ''} ${request.driver.lastName ?? ''}`.trim())
  }
  if (request.nurse) {
    parts.push(`${request.nurse.firstName ?? ''} ${request.nurse.lastName ?? ''}`.trim())
  }
  return parts.filter(Boolean).join(' · ') || 'Crew not assigned'
}

export default function ActiveMissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 py-20 text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500" />
        </div>
      }
    >
      <ActiveMissionsContent />
    </Suspense>
  )
}

function ActiveMissionsContent() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<SimpleMissionPhaseFilter>('ALL')
  const [dispatcherScope, setDispatcherScope] = useState<DispatcherActiveScope>('my-active')
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)
  const [detailPreview, setDetailPreview] = useState<EmergencyRequest | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<EmergencyRequest | null>(null)
  const [cancelTarget, setCancelTarget] = useState<EmergencyRequest | null>(null)
  const [assignHospitalTarget, setAssignHospitalTarget] = useState<EmergencyRequest | null>(null)
  const [reassignTarget, setReassignTarget] = useState<EmergencyRequest | null>(null)

  const openCaseDetail = useCallback((request: EmergencyRequest) => {
    setDetailCaseId(request.id)
    setDetailPreview(request)
    setHighlightId(request.id)
    setTimeout(() => setHighlightId(null), 4000)
  }, [])

  useFocusedCaseFromUrl({
    onOpenCase: openCaseDetail,
    redirectPendingTo: paths.pending,
  })

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(
        portal,
        portal === 'dispatcher' ? dispatcherScope : undefined,
        { activeOnly: true },
      )
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch active missions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal, dispatcherScope])

  useEffect(() => {
    fetchRequests(true)
    const intervalMs = detailCaseId ? 4000 : 8000
    const interval = setInterval(() => fetchRequests(false), intervalMs)
    return () => clearInterval(interval)
  }, [fetchRequests, detailCaseId])

  const phaseCounts = useMemo(() => {
    const counts: Record<SimpleMissionPhaseFilter, number> = {
      ALL: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      AT_HOSPITAL: 0,
    }
    for (const request of requests) {
      for (const filter of SIMPLE_MISSION_PHASE_FILTERS) {
        if (matchesSimpleMissionPhaseFilter(request.status, filter.value)) {
          counts[filter.value]++
        }
      }
    }
    return counts
  }, [requests])

  const filteredRequests = requests
    .filter((request) => matchesSimpleMissionPhaseFilter(request.status, phaseFilter))
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${request.ambulance?.ambulanceNumber || ''}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const stats = {
    total: filteredRequests.length,
    active: filteredRequests.filter((r) => ACTIVE_MISSION_STATUSES.includes(r.status)).length,
    pending: filteredRequests.filter((r) => r.status === 'ASSIGNED').length,
    critical: filteredRequests.filter((r) => r.priority === 'CRITICAL').length,
  }

  const activeFilterLabel =
    SIMPLE_MISSION_PHASE_FILTERS.find((f) => f.value === phaseFilter)?.label ?? 'All active'

  const handleActionSuccess = useCallback(() => {
    void fetchRequests(false)
  }, [fetchRequests])

  const isCaseClosed = (status: string) =>
    CLOSED_EMERGENCY_STATUSES.includes(status as (typeof CLOSED_EMERGENCY_STATUSES)[number])

  return (
    <div className="active-missions-page p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Siren className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Active Cases</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Live cases — code, location, crew, and simple status only.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchRequests(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      {portal === 'dispatcher' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDispatcherScope('my-active')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active-missions-filter-pill ${
              dispatcherScope === 'my-active'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            My cases
          </button>
          <button
            type="button"
            onClick={() => setDispatcherScope('station-active')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active-missions-filter-pill ${
              dispatcherScope === 'station-active'
                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Station cases
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SIMPLE_MISSION_PHASE_FILTERS.map((filter) => {
          const Icon = filter.icon
          const isActive = phaseFilter === filter.value
          const count = phaseCounts[filter.value]

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPhaseFilter(filter.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active-missions-filter-pill ${
                isActive
                  ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{filter.label}</span>
              <span
                className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search code, patient, location, unit…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 active-missions-input"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && requests.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm active-missions-card">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading active cases…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 active-missions-card">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No cases in this view</p>
            <p className="text-sm text-slate-500 mt-1">
              No matches for &quot;{activeFilterLabel}&quot;
              {searchTerm ? ` · "${searchTerm}"` : ''}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const elapsedMin = Math.floor(
              (Date.now() - new Date(request.createdAt).getTime()) / 60000,
            )
            const patientName = request.patient?.fullName || request.callerName || 'Unknown'
            const destination =
              request.destinationHospital?.name || request.destination || 'Not set'

            return (
              <div
                key={request.id}
                id={`case-row-${request.id}`}
                className={`active-missions-card bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                  highlightId === request.id
                    ? 'border-red-400 ring-2 ring-red-300'
                    : 'border-slate-100 hover:border-red-100'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-stretch">
                  <div className="flex-1 p-5 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-red-600">{request.trackingCode}</span>
                      <PriorityBadge priority={request.priority} size="sm" />
                      <SimpleStatusPill status={request.status} />
                      <span className="text-xs font-semibold text-slate-400 ml-auto">
                        {elapsedMin} min
                      </span>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase text-slate-400">Patient</dt>
                          <dd className="font-semibold text-slate-800 truncate">{patientName}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase text-slate-400">Pickup</dt>
                          <dd className="font-medium text-slate-700 line-clamp-2">
                            {request.pickupLocation}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase text-slate-400">Hospital</dt>
                          <dd className="font-medium text-slate-700 line-clamp-2">{destination}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 min-w-0">
                        <Truck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase text-slate-400">Crew</dt>
                          <dd className="font-medium text-slate-700 truncate">{crewLine(request)}</dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  <div className="p-4 lg:p-5 lg:w-48 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap shrink-0">
                    {!isCaseClosed(request.status) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setReassignTarget(request)}
                          className="active-missions-action-btn active-missions-action-btn--reassign flex-1 lg:flex-none h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          Reassign
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignHospitalTarget(request)}
                          className="active-missions-action-btn active-missions-action-btn--assign flex-1 lg:flex-none h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Hospital
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompleteTarget(request)}
                          className="active-missions-action-btn active-missions-action-btn--complete flex-1 lg:flex-none h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(request)}
                          className="active-missions-action-btn active-missions-action-btn--cancel flex-1 lg:flex-none h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => router.push(paths.caseDetail(request.id))}
                      className="active-missions-action-btn active-missions-action-btn--open flex-1 lg:flex-none h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <CaseDetailModal
        caseId={detailCaseId}
        open={Boolean(detailCaseId)}
        preview={detailPreview}
        casePageBase={paths.base}
        onClose={() => {
          setDetailCaseId(null)
          setDetailPreview(null)
        }}
      />

      {completeTarget && (
        <CompleteCaseModal
          request={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {cancelTarget && (
        <CancelModal
          request={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {assignHospitalTarget && (
        <AssignHospitalModal
          request={assignHospitalTarget}
          onClose={() => setAssignHospitalTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {reassignTarget && (
        <AssignModal
          request={reassignTarget}
          mode="reassign"
          onClose={() => setReassignTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  )
}
