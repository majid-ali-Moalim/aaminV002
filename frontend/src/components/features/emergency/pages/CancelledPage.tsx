'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  XCircle,
  RefreshCw,
  Search,
  Eye,
  MapPin,
  User,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

function cancellationReason(request: EmergencyRequest): string {
  return (
    request.cancellationReason?.trim() ||
    request.notes?.trim() ||
    'No cancellation reason recorded'
  )
}

export default function CancelledRequestsPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRequests = async () => {
    try {
      if (requests.length === 0) setIsLoading(true)
      const data = await fetchEmergencyRequests(portal, portal === 'dispatcher' ? 'my-cases' : undefined)
      setRequests(Array.isArray(data) ? data.filter((r) => r.status === 'CANCELLED') : [])
    } catch (err) {
      console.error('Failed to fetch cancelled requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchRequests()
  }, [])

  const filteredRequests = requests
    .filter((request) => {
      const searchTarget =
        `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${cancellationReason(request)}`.toLowerCase()
      return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <XCircle className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Cancelled Cases</h1>
            <p className="text-slate-300/90 mt-2 max-w-2xl text-sm leading-relaxed">
              Cases cancelled during triage or dispatch review. Each entry includes the documented
              cancellation reason.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void fetchRequests()}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking code, patient, location, or reason…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Case
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Patient & location
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Cancellation reason
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Cancelled
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
                    <p className="text-sm font-semibold text-slate-500">Loading cancelled cases…</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">No cancelled cases</p>
                    <p className="text-xs text-slate-400 mt-1">Cancelled triage cases will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-black text-slate-900 font-mono">{request.trackingCode}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={request.priority} size="sm" />
                          <StatusBadge status={request.status} size="sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {request.patient?.fullName || 'Unknown patient'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="line-clamp-2">{request.pickupLocation}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-md">
                      <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                        {cancellationReason(request)}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDistanceToNow(
                          new Date(request.cancelledAt || request.updatedAt || request.createdAt),
                          { addSuffix: true },
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold text-xs"
                        onClick={() => router.push(paths.caseTimeline(request.id))}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
