'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, ArrowRight, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'

interface EmergencyFilteredPageProps {
  title: string
  description: string
  icon: LucideIcon
  filter: (request: EmergencyRequest) => boolean
  emptyTitle?: string
  emptyDescription?: string
  refreshMs?: number
  headerExtra?: ReactNode
  onRowAction?: (request: EmergencyRequest) => ReactNode
}

export default function EmergencyFilteredPage({
  title,
  description,
  icon: Icon,
  filter,
  emptyTitle = 'No cases found',
  emptyDescription = 'Nothing matches this view right now.',
  refreshMs = 8000,
  headerExtra,
  onRowAction,
}: EmergencyFilteredPageProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const load = async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data.filter(filter) : [])
    } catch (err) {
      console.error('Failed to fetch emergency cases:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(false), refreshMs)
    return () => clearInterval(interval)
  }, [])

  const filtered = requests
    .filter((r) => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      return (
        r.trackingCode?.toLowerCase().includes(q) ||
        r.patient?.fullName?.toLowerCase().includes(q) ||
        r.pickupLocation?.toLowerCase().includes(q) ||
        r.ambulance?.ambulanceNumber?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const stats = {
    total: filtered.length,
    active: filtered.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length,
    pending: filtered.filter((r) => r.status === 'PENDING').length,
    critical: filtered.filter((r) => r.priority === 'CRITICAL').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Icon className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
            Emergency Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-red-100/80 mt-2 max-w-2xl">{description}</p>
          {headerExtra}
        </div>
      </div>

      <EmergencyStatsBar stats={stats} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by code, patient, location…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
        <Button variant="outline" onClick={() => load(true)} className="rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading && filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">Loading cases…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">{emptyTitle}</p>
            <p className="text-sm text-slate-500 mt-1">{emptyDescription}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((request) => (
              <div
                key={request.id}
                className="p-5 hover:bg-red-50/30 transition-colors flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-red-600">{request.trackingCode}</span>
                    <PriorityBadge priority={request.priority} />
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="font-semibold text-slate-900">{request.patient?.fullName || 'Unknown patient'}</p>
                  <p className="text-sm text-slate-500 truncate">{request.pickupLocation}</p>
                  <p className="text-xs text-slate-400">
                    {request.ambulance?.ambulanceNumber
                      ? `Unit ${request.ambulance.ambulanceNumber}`
                      : 'Unassigned'}{' '}
                    • {formatDistanceToNow(new Date(request.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onRowAction?.(request)}
                  <Button
                    size="sm"
                    className="rounded-xl bg-red-600 hover:bg-red-700"
                    onClick={() => router.push(`/admin/emergency-requests/${request.id}`)}
                  >
                    Open <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
