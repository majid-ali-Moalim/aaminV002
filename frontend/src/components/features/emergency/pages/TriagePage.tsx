'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Shield,
  Search,
  MapPin,
  User,
  Truck,
  Clock,
  RefreshCw,
  ChevronRight,
  Phone,
  Timer,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import AssignModal from '@/components/features/emergency/AssignModal'
import { useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

export default function TriageQueuePage() {
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(portal, portal === 'dispatcher' ? 'pending' : undefined)
      const unassigned = Array.isArray(data)
        ? data.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING')
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

  const stats = {
    total: requests.length,
    active: requests.length,
    pending: requests.length,
    critical: requests.filter((r) => r.priority === 'CRITICAL').length,
  }

  const waitMinutes = selectedRequest
    ? Math.floor((Date.now() - new Date(selectedRequest.createdAt).getTime()) / 60000)
    : 0

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Hero */}
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
            <p className="text-red-100/80 mt-2 max-w-2xl">
              Review and prioritize unassigned cases before dispatch assignment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Critical: {stats.critical}
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

      <EmergencyStatsBar stats={stats} />

      {/* Split panel — layout preserved */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[640px]">
        {/* Queue sidebar */}
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

          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[560px] lg:max-h-none">
            {isLoading && requests.length === 0 ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
                <p className="text-sm text-slate-500">Loading triage queue…</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Queue is clear</p>
                <p className="text-xs text-slate-400 mt-1">No cases awaiting triage</p>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const selected = selectedRequest?.id === request.id
                const waitMin = Math.floor(
                  (Date.now() - new Date(request.createdAt).getTime()) / 60000,
                )
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

        {/* Detail panel */}
        <main className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[480px]">
          {selectedRequest ? (
            <>
              <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedRequest.status} size="lg" />
                      <PriorityBadge priority={selectedRequest.priority} size="lg" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {selectedRequest.trackingCode}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" />
                        Waiting {formatDistanceToNow(new Date(selectedRequest.createdAt))}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-100 px-5 py-3 text-center shrink-0">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                      Response clock
                    </p>
                    <p className="text-2xl font-black text-red-600">{waitMinutes}m</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar bg-slate-50/40">
                {/* Patient & location */}
                <div className="space-y-6">
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-red-500" />
                      Patient information
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                          <User className="w-7 h-7 text-red-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            {selectedRequest.patient?.fullName || 'Unknown'}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            {selectedRequest.patient?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {selectedRequest.patient.phone}
                              </span>
                            )}
                            {selectedRequest.patient?.gender && (
                              <span>{selectedRequest.patient.gender}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {(selectedRequest.patientCondition || selectedRequest.symptoms) && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Condition / symptoms
                          </p>
                          <p className="text-sm text-slate-700">
                            {selectedRequest.patientCondition || selectedRequest.symptoms}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Location details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Pickup
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedRequest.pickupLocation}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Destination
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedRequest.destination || 'To be determined'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Actions & metadata */}
                <div className="space-y-6">
                  <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-red-500" />
                      Dispatch action
                    </h3>
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-md">
                      <Truck className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5" />
                      <div className="relative z-10 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-red-300 uppercase tracking-wider">
                            Assignment status
                          </p>
                          <p className="text-xl font-black mt-1">Unit required</p>
                          <p className="text-sm text-slate-400 mt-2">
                            Assign an available ambulance and response team to this case.
                          </p>
                        </div>
                        <Button
                          onClick={() => setIsAssignModalOpen(true)}
                          className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                        >
                          <Truck className="w-5 h-5" />
                          Assign unit
                        </Button>
                      </div>
                    </div>
                  </section>

                  {selectedRequest.priority === 'CRITICAL' && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Critical priority</p>
                        <p className="text-xs text-red-700 mt-0.5">
                          Expedite triage and dispatch for this case.
                        </p>
                      </div>
                    </div>
                  )}

                  <section className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Case metadata
                    </p>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <span className="text-slate-500">Source</span>
                      <span className="text-right font-semibold text-slate-800">
                        {selectedRequest.requestSource || 'Direct'}
                      </span>
                      <span className="text-slate-500">Caller</span>
                      <span className="text-right font-semibold text-slate-800">
                        {selectedRequest.callerName || '—'}
                      </span>
                      <span className="text-slate-500">Case ID</span>
                      <span className="text-right font-mono text-slate-500 text-[10px] truncate">
                        {selectedRequest.id.slice(0, 12)}…
                      </span>
                    </div>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-600">Select a case</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xs">
                Choose a request from the triage queue to review details and assign a unit.
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
