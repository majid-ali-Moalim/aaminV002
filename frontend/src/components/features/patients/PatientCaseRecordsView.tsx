'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Search,
  Loader2,
  Truck,
  ExternalLink,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { Button } from '@/components/ui/button'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import { formatDateTimeShort } from '@/lib/patients/patientDisplay'
import { ARCHIVED_PATIENT_CASE_STATUSES } from '@/lib/emergency/dateFilters'

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'FAILED', 'ARRIVED_HOSPITAL']

export type PatientPortal = 'admin' | 'dispatcher'

function patientPaths(portal: PatientPortal) {
  const base = portal === 'dispatcher' ? '/dispatcher/patients' : '/admin/patients'
  return {
    patients: base,
    cases: `${base}/cases`,
    emergencyCase: (id: string) => `${base}/${id}`,
  }
}

export interface PatientCaseRecordsViewProps {
  activeOnly?: boolean
  closedOnly?: boolean
  portal?: PatientPortal
}

function emergencyTypeLabel(req: EmergencyRequest): string {
  return (
    req.incidentCategory?.name ||
    req.patientCondition ||
    req.symptoms?.slice(0, 40) ||
    'General emergency'
  )
}

function completedDate(req: EmergencyRequest): string | null {
  return req.completedAt || (req.status === 'CANCELLED' ? req.cancelledAt ?? null : null)
}

export default function PatientCaseRecordsView({
  activeOnly = false,
  closedOnly = false,
  portal = 'admin',
}: PatientCaseRecordsViewProps) {
  const paths = patientPaths(portal)
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientFilter = searchParams.get('patient') ?? ''

  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(patientFilter)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  useEffect(() => {
    if (patientFilter) setSearchTerm(patientFilter)
  }, [patientFilter])

  useEffect(() => {
    emergencyRequestsService
      .getAll()
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch cases:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const scopedRequests = useMemo(() => {
    if (closedOnly) {
      return requests.filter((r) => ARCHIVED_PATIENT_CASE_STATUSES.includes(r.status as typeof ARCHIVED_PATIENT_CASE_STATUSES[number]))
    }
    if (activeOnly) return requests.filter((r) => !CLOSED_STATUSES.includes(r.status))
    return requests
  }, [requests, activeOnly, closedOnly])

  const filteredRequests = useMemo(() => {
    return scopedRequests
      .filter((req) => {
        const patientName = req.patient?.fullName || req.callerName || ''
        const patientCode = req.patient?.patientCode || ''
        const q = searchTerm.toLowerCase().trim()
        const haystack =
          `${req.trackingCode} ${patientName} ${patientCode} ${req.patient?.phone || ''} ${emergencyTypeLabel(req)}`.toLowerCase()
        const matchesSearch = !q || haystack.includes(q)
        const matchesStatus = !statusFilter || req.status === statusFilter
        const matchesPriority = !priorityFilter || req.priority === priorityFilter
        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [scopedRequests, searchTerm, statusFilter, priorityFilter])

  const stats = useMemo(() => {
    const completed = scopedRequests.filter((r) => r.status === 'COMPLETED').length
    const cancelled = scopedRequests.filter((r) => r.status === 'CANCELLED').length
    const active = scopedRequests.filter((r) => !CLOSED_STATUSES.includes(r.status)).length
    return {
      total: scopedRequests.length,
      completed,
      cancelled,
      active,
    }
  }, [scopedRequests])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-red-700 to-red-600 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ClipboardList className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Mission Archive
            </p>
            <h1 className="text-3xl font-black tracking-tight">
              {closedOnly ? 'Closed Cases' : activeOnly ? 'Active Cases' : 'Patient Cases'}
            </h1>
            <p className="text-red-100/80 mt-2 max-w-2xl text-sm leading-relaxed">
              {closedOnly
                ? 'Completed and cancelled emergency missions — full case history for each patient.'
                : 'Every ambulance emergency request and mission. One patient can have many cases — e.g. Ahmed Ali may have CASE-001 through CASE-005 over several years.'}
            </p>
          </div>
          <Link href={paths.patients}>
            <Button
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 font-bold"
            >
              <FileText className="w-4 h-4 mr-2" />
              Patient Registry
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: closedOnly ? 'Closed Cases' : activeOnly ? 'Active Cases' : 'Total Cases', value: stats.total, icon: FileText },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
          { label: 'Cancelled', value: stats.cancelled, icon: XCircle },
          ...(closedOnly
            ? []
            : [{ label: 'In Progress', value: stats.active, icon: Activity }]),
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
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search case number, patient name, or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
        >
          <option value="">All statuses</option>
          {closedOnly ? (
            <>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </>
          ) : (
            <>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="TRANSPORTING">Transporting</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </>
          )}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
        >
          <option value="">All priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        {patientFilter && (
          <Button
            variant="outline"
            className="h-11 rounded-xl shrink-0"
            onClick={() => {
              setSearchTerm('')
              router.replace(paths.cases)
            }}
          >
            Clear patient filter
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Case Number',
                  'Patient Name',
                  'Emergency Type',
                  'Priority',
                  'Status',
                  'Ambulance',
                  'Created',
                  'Completed',
                  '',
                ].map((h) => (
                  <th
                    key={h || 'actions'}
                    className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Loading cases…
                    </p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No cases found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const patientName =
                    req.patient?.fullName || req.callerName || 'Unknown patient'
                  const done = completedDate(req)

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs font-black text-red-600">
                          {req.trackingCode}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{patientName}</p>
                          {req.patient?.patientCode && (
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {req.patient.patientCode}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 max-w-[200px]">
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {emergencyTypeLabel(req)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={req.priority} size="sm" />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="px-4 py-4">
                        {req.ambulance ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                            <Truck className="w-3 h-3" />
                            {req.ambulance.ambulanceNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTimeShort(req.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm whitespace-nowrap">
                        {done ? (
                          <span className="font-semibold text-emerald-700">
                            {formatDateTimeShort(done)}
                          </span>
                        ) : req.status === 'CANCELLED' ? (
                          <span className="text-red-500 font-semibold">Cancelled</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={paths.emergencyCase(req.id)}>
                          <Button variant="outline" size="sm" className="rounded-lg h-8 gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
