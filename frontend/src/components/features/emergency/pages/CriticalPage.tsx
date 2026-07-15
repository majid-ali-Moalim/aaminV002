'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertOctagon,
  RefreshCw,
  Search,
  ExternalLink,
  Activity as ActivityIcon,
  Clock,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import {
  CRITICAL_RANGE_PRESETS,
  getCriticalRange,
  isCriticalCaseInRange,
  type CriticalRangePreset,
} from '@/lib/emergency/dateFilters'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'
import { emergencyRequestsService } from '@/lib/api'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  PICKED_UP: 'Picked Up',
  TRANSPORTING: 'Transporting',
  AT_HOSPITAL: 'At Hospital',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
}

const statusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, ' ')

export default function CriticalCasesPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [rangePreset, setRangePreset] = useState<CriticalRangePreset>('day')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const range = getCriticalRange(rangePreset)
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
            return isCriticalCaseInRange(r, range)
          }),
        )
      } else {
        const data = await fetchEmergencyRequests('admin')
        setRequests(
          Array.isArray(data) ? data.filter((r) => isCriticalCaseInRange(r, range)) : [],
        )
      }
    } catch (err) {
      console.error('Failed to fetch critical requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal, rangePreset])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 5000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const handleDelete = useCallback(
    async (request: EmergencyRequest) => {
      if (!window.confirm(`Delete critical case ${request.trackingCode}? This cannot be undone.`)) {
        return
      }
      try {
        setDeletingId(request.id)
        await emergencyRequestsService.delete(request.id)
        setRequests((prev) => prev.filter((r) => r.id !== request.id))
        toast.success(`Case ${request.trackingCode} deleted`)
      } catch (err) {
        console.error('Failed to delete critical case:', err)
        toast.error('Failed to delete case')
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

  const stats = {
    total: requests.length,
    active: requests.filter(
      (r) => !['COMPLETED', 'CANCELLED', 'FAILED'].includes(r.status),
    ).length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
    cancelled: requests.filter((r) => r.status === 'CANCELLED').length,
    critical: requests.length,
  }

  const statusOptions = Array.from(new Set(requests.map((r) => r.status))).sort()

  const filteredRequests = requests
    .filter((request) => {
      if (statusFilter === 'ALL') return true
      if (statusFilter === 'ACTIVE') {
        return !['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status)
      }
      return request.status === statusFilter
    })
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
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-red-300/40 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 bg-red-300 rounded-full" />
                {stats.pending} unassigned
              </div>
            )}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/10 border border-white/30">
              {CRITICAL_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setRangePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    rangePreset === preset.id
                      ? 'bg-white text-red-700 shadow-sm'
                      : 'text-red-100 hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
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

      {/* Stats — medium cards (click to filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left bg-white rounded-2xl border-2 shadow-sm px-6 py-5 flex items-center justify-between transition-all hover:shadow-md ${
            statusFilter === 'ALL' ? 'border-red-400 ring-2 ring-red-100' : 'border-red-100'
          }`}
        >
          <div>
            <p className="text-[11px] font-black text-red-900 uppercase tracking-widest mb-1">
              Total Critical
            </p>
            <p className="text-3xl font-black text-red-600">{stats.total}</p>
          </div>
          <AlertOctagon className="w-9 h-9 text-red-300" />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`text-left bg-white rounded-2xl border-2 shadow-sm px-6 py-5 flex items-center justify-between transition-all hover:shadow-md ${
            statusFilter === 'ACTIVE' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-100'
          }`}
        >
          <div>
            <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-1">
              Active Critical
            </p>
            <p className="text-3xl font-black text-blue-600">{stats.active}</p>
          </div>
          <ActivityIcon className="w-9 h-9 text-blue-300" />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`text-left bg-white rounded-2xl border-2 shadow-sm px-6 py-5 flex items-center justify-between transition-all hover:shadow-md ${
            statusFilter === 'PENDING' ? 'border-orange-400 ring-2 ring-orange-100' : 'border-orange-100'
          }`}
        >
          <div>
            <p className="text-[11px] font-black text-orange-900 uppercase tracking-widest mb-1">
              Pending Assign
            </p>
            <p className="text-3xl font-black text-orange-600">{stats.pending}</p>
          </div>
          <Clock className="w-9 h-9 text-orange-300" />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`text-left bg-white rounded-2xl border-2 shadow-sm px-6 py-5 flex items-center justify-between transition-all hover:shadow-md ${
            statusFilter === 'COMPLETED' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-emerald-100'
          }`}
        >
          <div>
            <p className="text-[11px] font-black text-emerald-900 uppercase tracking-widest mb-1">
              Completed
            </p>
            <p className="text-3xl font-black text-emerald-600">{stats.completed}</p>
          </div>
          <CheckCircle2 className="w-9 h-9 text-emerald-300" />
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('CANCELLED')}
          className={`text-left bg-white rounded-2xl border-2 shadow-sm px-6 py-5 flex items-center justify-between transition-all hover:shadow-md ${
            statusFilter === 'CANCELLED' ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-100'
          }`}
        >
          <div>
            <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">
              Cancelled
            </p>
            <p className="text-3xl font-black text-slate-600">{stats.cancelled}</p>
          </div>
          <XCircle className="w-9 h-9 text-slate-300" />
        </button>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search critical cases…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
        <div className="relative sm:w-56">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 appearance-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active only</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data table — raw rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && requests.length === 0 ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading critical cases…</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center">
            <AlertOctagon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No critical cases</p>
            <p className="text-sm text-slate-500 mt-1">
              No Priority 1 incidents for {getCriticalRange(rangePreset).label.toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => {
                  const isPending = request.status === 'PENDING'
                  return (
                    <tr
                      key={request.id}
                      className={`transition-colors hover:bg-slate-50 ${isPending ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => router.push(paths.caseDetail(request.id))}
                          className="font-black text-slate-800 hover:text-red-600 inline-flex items-center gap-1"
                          title="Open case"
                        >
                          {request.trackingCode}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">
                        {request.pickupLocation || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">
                          {request.patient?.fullName || 'Unknown'}
                        </span>
                        {request.patient?.phone && (
                          <span className="block text-xs text-slate-500">{request.patient.phone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {request.ambulance ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">
                            {request.ambulance.ambulanceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(request)}
                          disabled={deletingId === request.id}
                          className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 inline-flex items-center gap-1.5"
                          title="Delete case"
                        >
                          {deletingId === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
