'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckSquare,
  Clock,
  RefreshCw,
  Search,
  User,
  Truck,
  ArrowRight,
  Stethoscope,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { EmergencyRequest } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'
import {
  findLatestHandoverRecord,
  handoverOutcomeLabel,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'
import { minutesBetween, formatDurationMinutes } from '@/lib/emergency/caseTimingMetrics'
import { HOSPITAL_REFUSAL_REASON_OPTIONS } from '@/lib/emergency/buildCaseClosureDefaults'

function refusalLabel(value?: string | null) {
  if (!value) return ''
  return HOSPITAL_REFUSAL_REASON_OPTIONS.find((o) => o.value === value)?.label || value
}

function handoverSummary(request: EmergencyRequest) {
  const record = findLatestHandoverRecord(request.patientCareRecords ?? [])
  if (!record) return null
  const parsed = parseHandover(record.clinicalNotes)
  if (!parsed) return null

  const rejected = (parsed.rejectedHospitals ?? [])
    .filter((r) => r.hospitalName?.trim())
    .map((r) => {
      const parts = [r.hospitalName.trim()]
      const reason = refusalLabel(r.reason)
      if (reason) parts.push(`(${reason})`)
      if (r.notes?.trim()) parts.push(`— ${r.notes.trim()}`)
      return parts.join(' ')
    })
    .join('; ')

  return {
    hospital:
      parsed.acceptedHospital ||
      request.destinationHospital?.name ||
      request.destination ||
      '—',
    outcome: handoverOutcomeLabel(parsed.patientOutcome),
    condition: parsed.patientCondition || '',
    treatment: parsed.treatmentGiven || '',
    receivingDoctor: parsed.receivingStaff || '',
    notes: parsed.notes || '',
    signature: parsed.signature || '',
    rejected,
    nurseName: [record.nurse?.firstName, record.nurse?.lastName].filter(Boolean).join(' ') || 'Nurse',
    at: String(record.createdAt ?? ''),
  }
}

export default function CompletedRequestsPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRequests = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true)
      const data = await fetchEmergencyRequests(
        portal,
        portal === 'dispatcher' ? 'my-cases' : undefined,
      )
      setRequests(Array.isArray(data) ? data.filter((r) => r.status === 'COMPLETED') : [])
    } catch (err) {
      console.error('Failed to fetch completed requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [portal])

  useEffect(() => {
    fetchRequests(true)
    const interval = setInterval(() => fetchRequests(false), 15000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const filteredRequests = useMemo(() => {
    return requests
      .filter((request) => {
        const searchTarget =
          `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${request.ambulance?.ambulanceNumber || ''} ${request.destination || ''}`.toLowerCase()
        return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
      })
      .sort((a, b) => {
        const aTime = new Date(a.completedAt || a.updatedAt).getTime()
        const bTime = new Date(b.completedAt || b.updatedAt).getTime()
        return bTime - aTime
      })
  }, [requests, searchTerm])

  const withHandover = filteredRequests.filter((r) => Boolean(handoverSummary(r))).length

  const stats = {
    total: filteredRequests.length,
    active: withHandover,
    pending: filteredRequests.length - withHandover,
    critical: filteredRequests.filter((r) => r.priority === 'CRITICAL').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-slate-800 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <CheckSquare className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200 mb-2">
              Emergency Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Mission Completed</h1>
            <p className="text-emerald-100/80 mt-2 max-w-2xl">
              Closed cases with nurse handover outcome, hospital, and crew details.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchRequests(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <EmergencyStatsBar
        stats={{
          total: stats.total,
          active: stats.active,
          pending: stats.pending,
          critical: stats.critical,
        }}
      />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search code, patient, location, unit…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      <div className="space-y-4">
        {isLoading && requests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 text-slate-500">
            Loading completed missions…
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No completed missions</p>
            <p className="text-sm text-slate-500 mt-1">Closed cases will appear here after nurse handover.</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const summary = handoverSummary(request)
            const duration = formatDurationMinutes(
              minutesBetween(request.createdAt, request.completedAt || request.updatedAt),
            )
            const nurse =
              request.nurse
                ? `${request.nurse.firstName || ''} ${request.nurse.lastName || ''}`.trim()
                : summary?.nurseName || '—'
            const driver = request.driver
              ? `${request.driver.firstName || ''} ${request.driver.lastName || ''}`.trim()
              : '—'

            return (
              <article
                key={request.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-emerald-200 transition-colors"
              >
                <div className="p-5 flex flex-col lg:flex-row gap-5">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-emerald-700">{request.trackingCode}</span>
                      <PriorityBadge priority={request.priority} size="sm" />
                      <StatusBadge status={request.status} size="sm" />
                      <span className="text-xs font-semibold text-slate-400 ml-auto flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {duration}
                        {request.completedAt
                          ? ` · ${formatDistanceToNow(new Date(request.completedAt), { addSuffix: true })}`
                          : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Patient</p>
                          <p className="font-semibold text-slate-800">
                            {request.patient?.fullName || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Hospital</p>
                          <p className="font-medium text-slate-700 line-clamp-2">
                            {summary?.hospital ||
                              request.destinationHospital?.name ||
                              request.destination ||
                              '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Truck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Unit / Driver</p>
                          <p className="font-medium text-slate-700">
                            {[request.ambulance?.ambulanceNumber, driver].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Nurse</p>
                          <p className="font-medium text-slate-700">{nurse}</p>
                        </div>
                      </div>
                    </div>

                    {summary ? (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-black text-emerald-900">Handover</p>
                          {summary.at && (
                            <p className="text-xs text-emerald-700/80">
                              {format(new Date(summary.at), 'PPp')}
                            </p>
                          )}
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="text-[10px] font-bold uppercase text-slate-400">Patient status</dt>
                            <dd className="font-semibold text-slate-800">{summary.outcome}</dd>
                          </div>
                          {summary.receivingDoctor && (
                            <div>
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Receiving doctor</dt>
                              <dd className="font-medium text-slate-800">{summary.receivingDoctor}</dd>
                            </div>
                          )}
                          {summary.condition && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Condition</dt>
                              <dd className="text-slate-700">{summary.condition}</dd>
                            </div>
                          )}
                          {summary.treatment && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Treatment</dt>
                              <dd className="text-slate-700">{summary.treatment}</dd>
                            </div>
                          )}
                          {summary.rejected && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Rejected hospitals</dt>
                              <dd className="text-slate-700">{summary.rejected}</dd>
                            </div>
                          )}
                          {summary.notes && (
                            <div className="sm:col-span-2">
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Notes</dt>
                              <dd className="text-slate-700">{summary.notes}</dd>
                            </div>
                          )}
                          {summary.signature && (
                            <div>
                              <dt className="text-[10px] font-bold uppercase text-slate-400">Signature</dt>
                              <dd className="font-medium text-slate-800">{summary.signature}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        No nurse handover record on this completed case.
                      </p>
                    )}
                  </div>

                  <div className="lg:w-40 shrink-0">
                    <Button
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => router.push(paths.caseDetail(request.id))}
                    >
                      Open case <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
