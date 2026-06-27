'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertOctagon,
  Truck,
  MapPin,
  RefreshCw,
  Search,
  ArrowRight,
  Timer,
  User,
  Phone,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import AssignModal from '@/components/features/emergency/AssignModal'
import StatusUpdateModal from '@/components/features/emergency/StatusUpdateModal'
import { computeEmergencyStats, isTodayCriticalCase } from '@/lib/emergency/dateFilters'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

export default function CriticalCasesPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [activeModal, setActiveModal] = useState<'assign' | 'status' | null>(null)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      if (portal === 'dispatcher') {
        const [pending, active] = await Promise.all([
          fetchEmergencyRequests('dispatcher', 'pending'),
          fetchEmergencyRequests('dispatcher', 'my-active'),
        ])
        const merged = [...pending, ...active]
        const seen = new Set<string>()
        setRequests(
          merged.filter((r) => {
            if (seen.has(r.id)) return false
            seen.add(r.id)
            return isTodayCriticalCase(r)
          }),
        )
      } else {
        const data = await fetchEmergencyRequests('admin')
        setRequests(Array.isArray(data) ? data.filter(isTodayCriticalCase) : [])
      }
    } catch (err) {
      console.error('Failed to fetch critical requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 5000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const stats = {
    total: requests.length,
    active: requests.length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    critical: requests.length,
  }

  const filteredRequests = requests
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <AlertOctagon className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Critical Cases</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl">
              Today&apos;s critical (Priority 1) cases only — open incidents created today that still need response or follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-red-300/40 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 bg-red-300 rounded-full" />
                {stats.pending} unassigned
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => fetchRequests(true)}
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search critical cases…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
        />
      </div>

      {/* Card grid — layout preserved (2 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading && requests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading critical cases…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <AlertOctagon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No critical cases today</p>
            <p className="text-sm text-slate-500 mt-1">All clear — no open Priority 1 incidents from today</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const isPending = request.status === 'PENDING'
            const waitMin = Math.floor(
              (Date.now() - new Date(request.createdAt).getTime()) / 60000,
            )

            return (
              <div
                key={request.id}
                className={`relative bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                  isPending
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-slate-100 hover:border-red-100'
                }`}
              >
                {isPending && (
                  <div className="absolute inset-0 bg-red-50/30 animate-pulse pointer-events-none rounded-2xl" />
                )}

                {/* Card header */}
                <div className="relative p-4 bg-gradient-to-r from-red-700 to-red-600 text-white flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-black">{request.trackingCode}</span>
                      <span className="bg-white/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Crit-1
                      </span>
                    </div>
                    <p className="text-xs text-red-100 mt-1 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      {waitMin > 5 && (
                        <span className="text-red-200 font-bold"> · {waitMin}m wait</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PriorityBadge priority={request.priority} size="sm" />
                    <StatusBadge status={request.status} size="sm" />
                  </div>
                </div>

                <div className="relative p-5 flex-1 space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Location
                      </p>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {request.pickupLocation}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3" /> Patient
                      </p>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {request.patient?.fullName || 'Unknown'}
                      </p>
                      {request.patient?.phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {request.patient.phone}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {request.ambulance ? (
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                          {request.ambulance.ambulanceNumber}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold uppercase border border-red-200 animate-pulse">
                          No unit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                  {isPending ? (
                    <Button
                      onClick={() => {
                        setSelectedRequest(request)
                        setActiveModal('assign')
                      }}
                      className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      Assign unit
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedRequest(request)
                        setActiveModal('status')
                      }}
                      className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      Update status
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push(paths.caseDetail(request.id))}
                    className="h-11 w-11 rounded-xl p-0 shrink-0"
                    title="Open case"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {activeModal === 'assign' && selectedRequest && (
        <AssignModal
          request={selectedRequest}
          onClose={() => setActiveModal(null)}
          onSuccess={() => fetchRequests(false)}
        />
      )}
      {activeModal === 'status' && selectedRequest && (
        <StatusUpdateModal
          request={selectedRequest}
          onClose={() => setActiveModal(null)}
          onSuccess={() => fetchRequests(false)}
        />
      )}
    </div>
  )
}
