'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  Clock,
  Truck,
  RefreshCw,
  Search,
  MapPin,
  User,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import AssignModal from '@/components/features/emergency/AssignModal'
import DispatcherTriagePanel from '@/components/features/emergency/DispatcherTriagePanel'
import { useFocusedCaseFromUrl } from '@/components/features/emergency/useFocusedCaseFromUrl'
import { ESCALATION_DELAY_MINUTES, getWaitMinutes } from '@/lib/emergency/dateFilters'

export default function PendingRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 py-20 text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500" />
        </div>
      }
    >
      <PendingRequestsContent />
    </Suspense>
  )
}

function PendingRequestsContent() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const openCaseReview = useCallback((request: EmergencyRequest) => {
    setSelectedRequest(request)
    setHighlightId(request.id)
    setTimeout(() => setHighlightId(null), 4000)
  }, [])

  useFocusedCaseFromUrl({ onOpenCase: openCaseReview })

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      const pending = Array.isArray(data) ? data.filter((r) => r.status === 'PENDING') : []
      setRequests(pending)

      setSelectedRequest((prev) => {
        if (pending.length === 0) return null
        if (prev) {
          const updated = pending.find((r) => r.id === prev.id)
          return updated ?? pending[0]
        }
        return pending[0]
      })
    } catch (err) {
      console.error('Failed to fetch pending requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 5000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const stats = {
    total: requests.length,
    active: requests.length,
    pending: requests.length,
    critical: requests.filter((r) => r.priority === 'CRITICAL').length,
  }

  const filteredRequests = requests
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      const priorityWeight: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[a.priority] - priorityWeight[b.priority]
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const handleTriageSaved = (updated: EmergencyRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelectedRequest(updated)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-red-600 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ClipboardCheck className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Pending Review &amp; Triage</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl">
              Review caller information, verify conscious status, breathing, and bleeding, adjust
              priority if needed, then assign ambulance with driver and nurse.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchRequests(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh queue
          </Button>
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      <div className="flex flex-col lg:flex-row gap-6 min-h-[680px]">
        {/* Queue list */}
        <aside className="w-full lg:w-[380px] shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search pending cases…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[560px] lg:max-h-none">
            {isLoading && requests.length === 0 ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
                <p className="text-sm text-slate-500">Loading pending queue…</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Queue is clear</p>
                <p className="text-xs text-slate-400 mt-1">No cases awaiting review</p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const selected = selectedRequest?.id === request.id
                const waitMin = getWaitMinutes(request.createdAt)
                const isDelayed = waitMin >= ESCALATION_DELAY_MINUTES
                const isWarning = waitMin >= Math.floor(ESCALATION_DELAY_MINUTES / 2)

                return (
                  <div
                    key={request.id}
                    id={`case-row-${request.id}`}
                    onClick={() => openCaseReview(request)}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-all ${
                      highlightId === request.id
                        ? 'bg-red-50 border-l-4 border-l-red-500'
                        : selected
                          ? 'bg-red-50 border-l-4 border-l-red-600'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-black text-red-600">{request.trackingCode}</span>
                      <PriorityBadge priority={request.priority} size="sm" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {request.patient?.fullName || 'Unknown patient'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="truncate">{request.pickupLocation}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isDelayed ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {waitMin}m wait
                      </span>
                      {selected && <ChevronRight className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Triage panel */}
        <main className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
          {selectedRequest ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <PriorityBadge priority={selectedRequest.priority} size="lg" />
                  <span className="text-xs font-bold text-slate-400 uppercase">Caller reported</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">{selectedRequest.trackingCode}</h2>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedRequest.patient?.fullName || 'Unknown'} · {selectedRequest.pickupLocation}
                </p>
              </div>

              <DispatcherTriagePanel
                request={selectedRequest}
                onSaved={handleTriageSaved}
                onAssign={() => setIsAssignModalOpen(true)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <ClipboardCheck className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-600">Select a pending case</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Choose a case from the queue to review triage details, adjust priority, and assign
                a crew.
              </p>
            </div>
          )}
        </main>
      </div>

      {isAssignModalOpen && selectedRequest && (
        <AssignModal
          request={selectedRequest}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => fetchRequests(false)}
        />
      )}
    </div>
  )
}
