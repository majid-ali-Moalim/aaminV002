'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock, Truck, RefreshCw, Search, MapPin, User, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import AssignModal from '@/components/features/emergency/AssignModal'

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data.filter((r) => r.status === 'PENDING') : [])
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

  const openAssignModal = (request: EmergencyRequest) => {
    setSelectedRequest(request)
    setIsAssignModalOpen(true)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-red-600 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Clock className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Pending Queue</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl">
              Cases awaiting unit assignment — sorted by priority and wait time.
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, patient, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {/* Card grid — layout preserved */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && requests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading pending queue…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Queue is clear</p>
            <p className="text-sm text-slate-500 mt-1">No pending requests right now</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const waitTimeMin = Math.floor(
              (Date.now() - new Date(request.createdAt).getTime()) / 60000,
            )
            const isDelayed = waitTimeMin > 10
            const isWarning = waitTimeMin > 5

            return (
              <div
                key={request.id}
                className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
                  isDelayed
                    ? 'border-red-300 ring-1 ring-red-100'
                    : isWarning
                      ? 'border-amber-200'
                      : 'border-slate-100'
                }`}
              >
                {/* Card header */}
                <div
                  className={`p-4 text-white flex justify-between items-center ${
                    isDelayed
                      ? 'bg-gradient-to-r from-red-600 to-red-700'
                      : isWarning
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                        : 'bg-gradient-to-r from-slate-700 to-slate-900'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Tracking code
                    </span>
                    <p className="text-lg font-black">{request.trackingCode}</p>
                  </div>
                  <PriorityBadge priority={request.priority} size="sm" />
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location
                      </p>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                        {request.pickupLocation}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Wait
                      </p>
                      <p
                        className={`text-xl font-black ${
                          isDelayed
                            ? 'text-red-600 animate-pulse'
                            : isWarning
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {waitTimeMin}m
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> Patient
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {request.patient?.fullName || 'Unknown'}
                    </p>
                    {request.patient?.phone && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {request.patient.phone}
                      </p>
                    )}
                  </div>

                  {request.notes && (
                    <div className="border-l-2 border-red-200 pl-3 py-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Notes
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{request.notes}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <Button
                    onClick={() => openAssignModal(request)}
                    className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm shadow-red-200 flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Assign unit
                  </Button>
                </div>
              </div>
            )
          })
        )}
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
