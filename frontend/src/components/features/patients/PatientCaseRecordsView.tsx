'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Search,
  Loader2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Activity,
  Trash2,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { Button } from '@/components/ui/button'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import { formatDateTimeShort } from '@/lib/patients/patientDisplay'
import { ARCHIVED_PATIENT_CASE_STATUSES } from '@/lib/emergency/dateFilters'
import { simpleActiveCaseStatus } from '@/components/features/emergency/missionStatusOptions'
import UpdatePatientCaseModal from '@/components/features/patients/UpdatePatientCaseModal'
import { downloadPatientCasesReportPdf } from '@/lib/patients/exportPatientCasesPdf'

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'FAILED', 'ARRIVED_HOSPITAL']

export type PatientPortal = 'admin' | 'dispatcher'

function patientPaths(portal: PatientPortal) {
  const base = portal === 'dispatcher' ? '/dispatcher/patients' : '/admin/patients'
  const emergencyBase =
    portal === 'dispatcher' ? '/dispatcher/emergency-requests' : '/admin/emergency-requests'
  return {
    patients: base,
    cases: `${base}/cases`,
    emergencyCase: (id: string) => `${emergencyBase}/${id}`,
  }
}

export interface PatientCaseRecordsViewProps {
  activeOnly?: boolean
  closedOnly?: boolean
  portal?: PatientPortal
}

function emergencyTypeLabel(req: EmergencyRequest): string {
  return req.incidentCategory?.name || req.patientCondition || 'General emergency'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingCase, setUpdatingCase] = useState<EmergencyRequest | null>(null)
  const [pdfExporting, setPdfExporting] = useState(false)

  useEffect(() => {
    if (patientFilter) setSearchTerm(patientFilter)
  }, [patientFilter])

  const handleDelete = async (req: EmergencyRequest) => {
    if (!window.confirm(`Delete case ${req.trackingCode}? This cannot be undone.`)) return
    try {
      setDeletingId(req.id)
      await emergencyRequestsService.delete(req.id)
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
      toast.success(`Case ${req.trackingCode} deleted`)
    } catch (err) {
      console.error('Failed to delete case:', err)
      toast.error('Failed to delete case')
    } finally {
      setDeletingId(null)
    }
  }

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

  const exportPdf = async () => {
    if (!filteredRequests.length) {
      toast.error('No cases match your filters')
      return
    }
    setPdfExporting(true)
    const toastId = toast.loading(
      `Building PDF dossier for ${filteredRequests.length} case(s)…`,
    )
    try {
      await downloadPatientCasesReportPdf(filteredRequests, {
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter,
        patientFilter: patientFilter || undefined,
        activeOnly,
        closedOnly,
      })
      toast.success('Patient cases PDF downloaded', { id: toastId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      toast.error(message, { id: toastId })
    } finally {
      setPdfExporting(false)
    }
  }

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
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              onClick={() => void exportPdf()}
              disabled={pdfExporting || isLoading || filteredRequests.length === 0}
              className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-md"
            >
              {pdfExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generate PDF
            </Button>
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: closedOnly ? 'Closed' : activeOnly ? 'Active' : 'Total', value: stats.total, icon: FileText },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
          ...(closedOnly
            ? [{ label: 'Cancelled', value: stats.cancelled, icon: XCircle }]
            : [{ label: 'In progress', value: stats.active, icon: Activity }]),
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
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Case', 'Patient', 'Type', 'Priority', 'Status', 'Date', ''].map((h) => (
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
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Loading cases…
                    </p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No cases found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const patientName =
                    req.patient?.fullName || req.callerName || 'Unknown patient'
                  const statusLabel = simpleActiveCaseStatus(req.status)

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4">
                        <Link
                          href={paths.emergencyCase(req.id)}
                          className="font-mono text-xs font-black text-red-600 hover:underline"
                        >
                          {req.trackingCode}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{patientName}</p>
                        {req.patient?.phone && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{req.patient.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 max-w-[180px]">
                        <p className="text-sm text-slate-700 line-clamp-2">{emergencyTypeLabel(req)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={req.priority} size="sm" />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold text-slate-700">{statusLabel}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTimeShort(req.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={paths.emergencyCase(req.id)}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg h-8 gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => setUpdatingCase(req)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(req)}
                            disabled={deletingId === req.id}
                            className="rounded-lg h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50"
                            title="Delete case"
                          >
                            {deletingId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {updatingCase && (
        <UpdatePatientCaseModal
          request={updatingCase}
          onClose={() => setUpdatingCase(null)}
          onSuccess={(updated) => {
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
            )
          }}
        />
      )}
    </div>
  )
}
