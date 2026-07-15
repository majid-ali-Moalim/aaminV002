'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Truck,
  MapPin,
  Timer,
  User,
  Phone,
  ExternalLink,
  Siren,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import AssignModal from '@/components/features/emergency/AssignModal'
import {
  EMERGENCY_DELAY_MINUTES,
  NON_EMERGENCY_DELAY_MINUTES,
  formatLatency,
  getDelayThresholdMinutes,
  getWaitMinutes,
  isDelayedPendingCase,
  isNonEmergencyCase,
} from '@/lib/emergency/dateFilters'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

export default function EscalatedCasesPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(portal, portal === 'dispatcher' ? 'pending' : undefined)
      setRequests(Array.isArray(data) ? data.filter(isDelayedPendingCase) : [])
    } catch (err) {
      console.error('Failed to fetch escalated requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 10000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const stats = useMemo(() => {
    const emergencyDelayed = requests.filter((r) => !isNonEmergencyCase(r))
    const nonEmergencyDelayed = requests.filter((r) => isNonEmergencyCase(r))
    return {
      total: requests.length,
      emergency: emergencyDelayed.length,
      nonEmergency: nonEmergencyDelayed.length,
    }
  }, [requests])

  const filteredRequests = requests
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-amber-500 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <AlertTriangle className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Delayed Cases</h1>
            <p className="text-orange-100/80 mt-2 max-w-2xl text-sm leading-relaxed">
              Unassigned pending cases that exceeded the response window —{' '}
              <strong className="text-white">{EMERGENCY_DELAY_MINUTES / 60} hour</strong> for emergency
              requests and <strong className="text-white">{NON_EMERGENCY_DELAY_MINUTES / 60} hours</strong>{' '}
              for non-emergency bookings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-orange-300/40 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 bg-orange-300 rounded-full" />
                {stats.total} delayed
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Delay Cases',
            value: stats.total,
            icon: AlertTriangle,
            tone: 'bg-orange-50 text-orange-600',
          },
          {
            label: 'Emergency Delay Cases',
            value: stats.emergency,
            hint: `${EMERGENCY_DELAY_MINUTES / 60}h+ without crew`,
            icon: Siren,
            tone: 'bg-red-50 text-red-600',
          },
          {
            label: 'Non-Emergency Delay Cases',
            value: stats.nonEmergency,
            hint: `${NON_EMERGENCY_DELAY_MINUTES / 60}h+ without crew`,
            icon: Clock,
            tone: 'bg-amber-50 text-amber-600',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {item.label}
                </p>
                {'hint' in item && item.hint ? (
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.hint}</p>
                ) : null}
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${item.tone}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      {stats.total > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-orange-900">Protocol attention required</h2>
            <p className="text-sm text-orange-800/80 mt-0.5">
              Emergency cases must not wait more than {EMERGENCY_DELAY_MINUTES / 60} hour unassigned.
              Non-emergency bookings may wait up to {NON_EMERGENCY_DELAY_MINUTES / 60} hours before appearing
              here. Assign a crew immediately.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search delayed cases…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300"
        />
      </div>

      <div className="space-y-4">
        {isLoading && requests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-orange-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading delayed cases…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <AlertTriangle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No delayed cases</p>
            <p className="text-sm text-slate-500 mt-1">All pending cases are within the response window</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const waitTimeMin = getWaitMinutes(request.createdAt)
            const latencyLabel = formatLatency(waitTimeMin)
            const thresholdMin = getDelayThresholdMinutes(request)
            const nonEmergency = isNonEmergencyCase(request)

            return (
              <div
                key={request.id}
                className="bg-white rounded-2xl border border-orange-200 shadow-sm flex flex-col md:flex-row overflow-hidden transition-all duration-300 hover:shadow-md hover:border-orange-300"
              >
                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-6 flex flex-col items-center justify-center min-w-[140px] md:min-w-[160px] gap-1 text-white shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-200">
                    Latency
                  </p>
                  <p className="text-3xl font-black text-center leading-tight">{latencyLabel}</p>
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-orange-800/60 text-[9px] font-bold uppercase tracking-wider">
                    Over {thresholdMin / 60}h limit
                  </span>
                  <span className="text-[9px] font-semibold text-orange-200 mt-1">
                    {nonEmergency ? 'Non-emergency' : 'Emergency'}
                  </span>
                </div>

                <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Incident
                      </p>
                      <p className="text-lg font-black text-slate-800">{request.trackingCode}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityBadge priority={request.priority} size="sm" />
                        <StatusBadge status={request.status} size="sm" />
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            nonEmergency
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {nonEmergency ? 'Non-emergency' : 'Emergency'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </p>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> Patient
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {request.patient?.fullName || 'Unknown'}
                      </p>
                      {request.patient?.phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {request.patient.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Location
                      </p>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-slate-800 line-clamp-3">
                          {request.pickupLocation}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                      <p className="text-xs text-orange-800">
                        Delayed — pending {latencyLabel} without crew assignment (limit:{' '}
                        {thresholdMin >= 60 ? `${thresholdMin / 60}h` : `${thresholdMin}m`}).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request)
                        setIsAssignModalOpen(true)
                      }}
                      className="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      Assign unit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(paths.caseDetail(request.id))}
                      className="h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
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
