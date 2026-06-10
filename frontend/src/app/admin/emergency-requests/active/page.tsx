'use client'

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
  Navigation2,
  User,
  ExternalLink,
  ChevronDown,
  Filter,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import CaseDetailModal from '@/components/features/emergency/CaseDetailModal'
import { useFocusedCaseFromUrl } from '@/components/features/emergency/useFocusedCaseFromUrl'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import {
  ACTIVE_MISSION_STATUSES,
  MISSION_PHASE_FILTERS,
  matchesMissionPhaseFilter,
  type MissionPhaseFilter,
} from '@/components/features/emergency/missionStatusOptions'

const PROGRESS_STEPS = [
  { ids: ['ASSIGNED'], icon: Siren, label: 'Assigned' },
  { ids: ['DISPATCHED', 'EN_ROUTE'], icon: Navigation2, label: 'En route' },
  { ids: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'], icon: MapPin, label: 'On scene' },
  { ids: ['TRANSPORTING'], icon: Truck, label: 'Transit' },
  { ids: ['ARRIVED_HOSPITAL'], icon: Building2, label: 'Hospital' },
]

function statusStepIndex(status: string) {
  for (let i = 0; i < PROGRESS_STEPS.length; i++) {
    if (PROGRESS_STEPS[i].ids.includes(status)) return i
  }
  return -1
}

function getProgress(status: string) {
  const idx = statusStepIndex(status)
  if (idx < 0) return 10
  return ((idx + 1) / PROGRESS_STEPS.length) * 100
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
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<MissionPhaseFilter>('ALL')
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)
  const [detailPreview, setDetailPreview] = useState<EmergencyRequest | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const openCaseDetail = useCallback((request: EmergencyRequest) => {
    setDetailCaseId(request.id)
    setDetailPreview(request)
    setHighlightId(request.id)
    setTimeout(() => setHighlightId(null), 4000)
  }, [])

  useFocusedCaseFromUrl({
    onOpenCase: openCaseDetail,
    redirectPendingTo: '/admin/emergency-requests/pending',
  })

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch active missions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 8000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const phaseCounts = useMemo(() => {
    const counts: Record<MissionPhaseFilter, number> = {
      ALL: 0,
      EN_ROUTE: 0,
      TRANSPORTING: 0,
      ARRIVED_HOSPITAL: 0,
      PATIENT_STABILIZED: 0,
      COMPLETED: 0,
    }
    for (const request of requests) {
      for (const filter of MISSION_PHASE_FILTERS) {
        if (matchesMissionPhaseFilter(request.status, filter.value)) {
          counts[filter.value]++
        }
      }
    }
    return counts
  }, [requests])

  const filteredRequests = requests
    .filter((request) => matchesMissionPhaseFilter(request.status, phaseFilter))
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${request.ambulance?.ambulanceNumber || ''}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const stats = {
    total: filteredRequests.length,
    active: filteredRequests.filter((r) => ACTIVE_MISSION_STATUSES.includes(r.status)).length,
    pending: 0,
    critical: filteredRequests.filter((r) => r.priority === 'CRITICAL').length,
  }

  const activeFilterLabel =
    MISSION_PHASE_FILTERS.find((f) => f.value === phaseFilter)?.label ?? 'All Active'

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Siren className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Active Missions</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl">
              Live deployment grid — filter by mission phase. Status updates are handled by drivers.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchRequests(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh grid
          </Button>
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      {/* Phase filter pills */}
      <div className="flex flex-wrap gap-2">
        {MISSION_PHASE_FILTERS.map((filter) => {
          const Icon = filter.icon
          const isActive = phaseFilter === filter.value
          const count = phaseCounts[filter.value]

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPhaseFilter(filter.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
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

      {/* Search + dropdown filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, patient, location, unit…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
        <div className="relative sm:w-72 shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as MissionPhaseFilter)}
            className="w-full appearance-none pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          >
            {MISSION_PHASE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({phaseCounts[filter.value]})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Mission rows */}
      <div className="grid grid-cols-1 gap-5">
        {isLoading && requests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading active missions…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No missions in this view</p>
            <p className="text-sm text-slate-500 mt-1">
              No cases match &quot;{activeFilterLabel}&quot;
              {searchTerm ? ` for "${searchTerm}"` : ''}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const currentStep = statusStepIndex(request.status)
            const elapsedMin = Math.floor(
              (Date.now() - new Date(request.createdAt).getTime()) / 60000,
            )

            return (
              <div
                key={request.id}
                id={`case-row-${request.id}`}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 ${
                  highlightId === request.id
                    ? 'border-red-400 ring-2 ring-red-300 shadow-lg'
                    : 'border-slate-100 hover:border-red-100'
                }`}
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Identity column */}
                  <div className="lg:w-72 p-5 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Tracking code
                        </p>
                        <p className="text-xl font-black text-red-600">{request.trackingCode}</p>
                      </div>
                      <PriorityBadge priority={request.priority} size="sm" />
                    </div>
                    <StatusBadge status={request.status} />
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mission duration
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {elapsedMin}
                        <span className="text-sm font-semibold text-slate-500 ml-1">min</span>
                      </p>
                    </div>
                    {request.patient?.fullName && (
                      <p className="text-xs text-slate-600 mt-2 flex items-center gap-1 truncate">
                        <User className="w-3 h-3 shrink-0" />
                        {request.patient.fullName}
                      </p>
                    )}
                  </div>

                  {/* Progress & details */}
                  <div className="flex-1 p-5 space-y-6 min-w-0">
                    <div className="relative px-2 pt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full w-full absolute top-6 left-0" />
                      <div
                        className="h-1.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full absolute top-6 left-0 transition-all duration-700"
                        style={{ width: `${getProgress(request.status)}%` }}
                      />
                      <div className="relative z-10 flex justify-between">
                        {PROGRESS_STEPS.map((step, stepIdx) => {
                          const Icon = step.icon
                          const isPassed = currentStep >= stepIdx
                          const isCurrent = currentStep === stepIdx

                          return (
                            <div key={step.label} className="flex flex-col items-center">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                                  isCurrent
                                    ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-200 scale-110'
                                    : isPassed
                                      ? 'bg-red-50 border-red-200 text-red-600'
                                      : 'bg-white border-slate-200 text-slate-300'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wide mt-2 text-center max-w-[52px] leading-tight ${
                                  isCurrent
                                    ? 'text-red-600'
                                    : isPassed
                                      ? 'text-slate-600'
                                      : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Pickup
                        </p>
                        <p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-2">
                          {request.pickupLocation}
                        </p>
                        <div className="mt-2">
                          <PickupGpsPanel request={request} variant="compact" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Destination
                        </p>
                        <p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-2">
                          {request.destination || 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Unit
                        </p>
                        <p className="text-xs font-bold text-red-600 mt-1">
                          {request.ambulance?.ambulanceNumber || 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Driver
                        </p>
                        <p className="text-xs font-semibold text-slate-700 mt-1">
                          {request.driver
                            ? `${request.driver.firstName} ${request.driver.lastName}`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions — view only */}
                  <div className="p-5 lg:w-40 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col gap-2 justify-center shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => openCaseDetail(request)}
                      className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      title="View all case information"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/admin/emergency-requests/${request.id}`)}
                      className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open case
                    </Button>
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
        onClose={() => {
          setDetailCaseId(null)
          setDetailPreview(null)
        }}
      />
    </div>
  )
}
