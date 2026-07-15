'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Shield,
  Search,
  MapPin,
  User,
  RefreshCw,
  ChevronRight,
  Clock,
  ClipboardCheck,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import AssignModal from '@/components/features/emergency/AssignModal'
import CancelModal from '@/components/features/emergency/CancelModal'
import DispatcherTriagePanel from '@/components/features/emergency/DispatcherTriagePanel'
import { formatLatency, getWaitMinutes } from '@/lib/emergency/dateFilters'
import { useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

export default function TriageQueuePage() {
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(portal, portal === 'dispatcher' ? 'pending' : undefined)
      const unassigned = Array.isArray(data)
        ? data.filter(
            (r) =>
              (r.status === 'PENDING' || r.status === 'REVIEWING') &&
              !r.ambulanceId &&
              !r.driverId &&
              !r.nurseId,
          )
        : []
      setRequests(unassigned)

      setSelectedRequest((prev) => {
        if (unassigned.length === 0) return null
        if (prev) {
          const updated = unassigned.find((r) => r.id === prev.id)
          return updated ?? unassigned[0]
        }
        return unassigned[0]
      })
    } catch (err) {
      console.error('Failed to fetch triage queue:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 5000)
    return () => clearInterval(interval)
  }, [fetchRequests])

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

  const handleCancelSuccess = () => {
    setIsCancelModalOpen(false)
    toast.success('Case cancelled and moved to cancellation log')
    void fetchRequests(false)
  }

  const handleKeepPending = () => {
    if (!selectedRequest) return
    toast.success(`${selectedRequest.trackingCode} kept in triage queue for further review`)
  }

  const waitMinutes = selectedRequest ? getWaitMinutes(selectedRequest.createdAt) : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Triage Queue</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl text-sm leading-relaxed">
              Review caller information, verify patient status, adjust assessed priority, then assign a
              crew — or cancel with a documented reason. Cancelled cases appear in the cancellation log.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              In queue: {requests.length}
            </div>
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

      <div className="flex flex-col lg:flex-row gap-6 min-h-[680px]">
        <aside className="w-full lg:w-[400px] shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search queue…"
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
                <p className="text-sm text-slate-500">Loading triage queue…</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Queue is clear</p>
                <p className="text-xs text-slate-400 mt-1">No cases awaiting triage review</p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const selected = selectedRequest?.id === request.id
                const waitMin = getWaitMinutes(request.createdAt)
                return (
                  <div
                    key={request.id}
                    onClick={() => setSelectedRequest(request)}
                    className={`p-4 border-b border-slate-50 cursor-pointer transition-all ${
                      selected
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
                        className={`text-[10px] font-bold ${waitMin > 10 ? 'text-red-600' : waitMin > 5 ? 'text-amber-600' : 'text-slate-500'}`}
                      >
                        {formatLatency(waitMin)} wait
                      </span>
                      {selected && <ChevronRight className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <main className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
          {selectedRequest ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <PriorityBadge priority={selectedRequest.priority} size="lg" />
                  <span className="text-xs font-bold text-slate-400 uppercase">Awaiting review</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedRequest.trackingCode}</h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedRequest.patient?.fullName || 'Unknown'} · {selectedRequest.pickupLocation}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-center shrink-0">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Wait time</p>
                    <p className="text-xl font-black text-red-600">{formatLatency(waitMinutes)}</p>
                  </div>
                </div>
              </div>

              <DispatcherTriagePanel
                request={selectedRequest}
                onSaved={handleTriageSaved}
                onAssign={() => setIsAssignModalOpen(true)}
              />

              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleKeepPending}
                  className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Keep pending
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex-1 h-12 rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel case
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-600">Select a case</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Choose a request from the triage queue to review, adjust priority, assign a crew, or
                cancel with a reason.
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

      {isCancelModalOpen && selectedRequest && (
        <CancelModal
          request={selectedRequest}
          onClose={() => setIsCancelModalOpen(false)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  )
}
