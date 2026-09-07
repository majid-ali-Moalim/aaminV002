'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  UserX,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { employeeAttendanceService } from '@/lib/api'
import { activeShiftLabel } from '@/lib/employment/shiftTypes'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import { AVAILABILITY_LABELS, displayAvailabilityStatus } from '@/lib/availability/labels'
import { downloadAvailabilityPdf } from '@/lib/availability/exportAvailabilityPdf'

type AttendanceRow = {
  recordId?: string | null
  employeeDbId: string
  employeeId: string
  employeeName: string
  role: string
  department: string
  phone: string
  shift: string
  status: 'Present' | 'Absent' | string
  present: boolean
  absent: boolean
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  hoursInProgress?: boolean
  profilePhoto?: string | null
  canMarkAttendance?: boolean
  onCurrentShift?: boolean
  requiresShiftMatch?: boolean
  attendanceBlockReason?: string | null
}

type MissedShiftAlert = {
  alertKey: string
  employeeId: string
  employeeName: string
  role: string
  shiftName: string
  shiftWindow: string
  date: string
  message: string
}

const DISMISSED_ALERTS_KEY = 'aamin-attendance-dismissed-alerts'

function loadDismissedAlerts(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function persistDismissedAlerts(keys: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(Array.from(keys)))
}

function formatClock(value: string | null) {
  if (!value) return '—'
  return format(new Date(value), 'MMM d, yyyy · HH:mm:ss')
}

function formatHours(row: AttendanceRow) {
  if (row.totalHours == null) return '—'
  const label = `${row.totalHours.toFixed(2)} h`
  return row.hoursInProgress ? `${label} (in progress)` : label
}

function statusBadge(status: string) {
  const available = status === 'Present'
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
        available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {displayAvailabilityStatus(status)}
    </span>
  )
}

function downloadCsv(rows: AttendanceRow[], filename: string) {
  if (!rows.length) {
    toast.error('No data to export')
    return
  }
  const keys = [
    'employeeId',
    'employeeName',
    'role',
    'department',
    'shift',
    'status',
    'clockIn',
    'clockOut',
    'totalHours',
  ]
  const csv = [
    keys.join(','),
    ...rows.map((r) =>
      keys
        .map((k) => {
          let v: unknown = (r as Record<string, unknown>)[k]
          if (k === 'clockIn' || k === 'clockOut') v = v ? formatClock(String(v)) : ''
          if (k === 'status') v = displayAvailabilityStatus(String(v ?? ''))
          if (k === 'totalHours') v = r.totalHours ?? ''
          return `"${String(v ?? '').replace(/"/g, '""')}"`
        })
        .join(','),
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Export downloaded')
}

function EditRecordModal({
  row,
  onClose,
  onSaved,
}: {
  row: AttendanceRow
  onClose: () => void
  onSaved: () => void
}) {
  const [clockIn, setClockIn] = useState(
    row.clockIn ? format(new Date(row.clockIn), "yyyy-MM-dd'T'HH:mm") : '',
  )
  const [clockOut, setClockOut] = useState(
    row.clockOut ? format(new Date(row.clockOut), "yyyy-MM-dd'T'HH:mm") : '',
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!row.recordId) {
      toast.error(AVAILABILITY_LABELS.noRecord)
      return
    }
    setSaving(true)
    try {
      await employeeAttendanceService.updateRecord(row.recordId, {
        checkIn: clockIn ? new Date(clockIn).toISOString() : undefined,
        checkOut: clockOut ? new Date(clockOut).toISOString() : null,
        status: clockIn ? 'ON_TIME' : 'ABSENT',
      })
      toast.success(AVAILABILITY_LABELS.updated)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-black text-gray-900">{AVAILABILITY_LABELS.editStatus}</h3>
        <p className="text-sm text-gray-500">{row.employeeName} · {row.employeeId}</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-500">Shift start</span>
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-500">Shift end</span>
          <input
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 rounded-xl">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeAttendanceView() {
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [summary, setSummary] = useState<{
    total: number
    present: number
    absent: number
    presentPercentage?: number
    absentPercentage?: number
  } | null>(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Present' | 'Absent'>('all')
  const [editRow, setEditRow] = useState<AttendanceRow | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [missedAlerts, setMissedAlerts] = useState<MissedShiftAlert[]>([])
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<Set<string>>(() => loadDismissedAlerts())
  const [activeShift, setActiveShift] = useState(activeShiftLabel())
  const [viewingToday, setViewingToday] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)

  const loadDay = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await employeeAttendanceService.getByDay(date)
      setRows(res.items ?? [])
      setSummary(res.summary ?? null)
      setMissedAlerts(Array.isArray(res.missedShiftAlerts) ? res.missedShiftAlerts : [])
      setActiveShift(res.activeShiftLabel ?? activeShiftLabel())
      setViewingToday(Boolean(res.isToday))
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || AVAILABILITY_LABELS.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDay(selectedDate)
  }, [selectedDate, loadDay])

  const visibleMissedAlerts = useMemo(
    () => missedAlerts.filter((a) => !dismissedAlertKeys.has(a.alertKey)),
    [missedAlerts, dismissedAlertKeys],
  )

  const dismissAlert = (alertKey: string) => {
    setDismissedAlertKeys((prev) => {
      const next = new Set(prev)
      next.add(alertKey)
      persistDismissedAlerts(next)
      return next
    })
  }

  const dismissAllAlerts = () => {
    setDismissedAlertKeys((prev) => {
      const next = new Set(prev)
      for (const alert of missedAlerts) next.add(alert.alertKey)
      persistDismissedAlerts(next)
      return next
    })
  }

  const markAttendance = async (row: AttendanceRow, action: 'present' | 'absent') => {
    if (row.canMarkAttendance === false) {
      toast.error(row.attendanceBlockReason || AVAILABILITY_LABELS.shiftOnly)
      return
    }
    setMarkingId(row.employeeDbId)
    try {
      await employeeAttendanceService.markAttendance({
        employeeId: row.employeeDbId,
        date: selectedDate,
        action,
      })
      toast.success(action === 'present' ? AVAILABILITY_LABELS.markedAvailable : AVAILABILITY_LABELS.markedUnavailable)
      await loadDay(selectedDate)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || AVAILABILITY_LABELS.updateFailed)
    } finally {
      setMarkingId(null)
    }
  }

  const filtered = useMemo(() => {
    let list = [...rows]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          String(r.employeeId).toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q),
      )
    }
    if (role) list = list.filter((r) => r.role === role)
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    return list
  }, [rows, search, role, statusFilter])

  const roles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))).sort(),
    [rows],
  )

  const exportPdf = async () => {
    if (!filtered.length) {
      toast.error('No data to export')
      return
    }
    setExportingPdf(true)
    try {
      await downloadAvailabilityPdf({
        date: selectedDate,
        rows: filtered,
        summary,
        filters: { search, role, statusFilter },
        activeShift,
        viewingToday,
      })
      toast.success('PDF report downloaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      toast.error(message)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{AVAILABILITY_LABELS.module}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mark drivers and nurses as available or unavailable for dispatch during their shift
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/employees/attendance/scores">
            <Button variant="outline" className="rounded-xl h-10 border-violet-200 text-violet-700 hover:bg-violet-50">
              <BarChart3 className="w-4 h-4 mr-2" />
              Availability reports
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-10">
            <Calendar className="w-4 h-4 text-red-600" />
            <input
              type="date"
              className="text-sm font-bold outline-none"
              value={selectedDate}
              max={todayIso}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => loadDay(selectedDate)} className="rounded-xl h-10">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadCsv(filtered, `availability-${selectedDate}.csv`)}
            className="rounded-xl h-10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => void exportPdf()}
            disabled={exportingPdf || filtered.length === 0}
            className="bg-red-600 hover:bg-red-700 rounded-xl h-10"
          >
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Generate PDF
          </Button>
        </div>
      </div>

      {visibleMissedAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm font-black text-amber-900">
                Missed shift starts ({visibleMissedAlerts.length})
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg border-amber-200 text-amber-800 hover:bg-amber-100"
              onClick={dismissAllAlerts}
            >
              Dismiss all
            </Button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {visibleMissedAlerts.map((alert) => (
              <li
                key={alert.alertKey}
                className="flex items-start gap-3 rounded-xl bg-white border border-amber-100 px-3 py-2.5 text-sm"
              >
                <p className="flex-1 text-amber-950 leading-relaxed">{alert.message}</p>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.alertKey)}
                  className="shrink-0 p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 hover:text-amber-900"
                  title="Dismiss"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {viewingToday && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <span className="font-bold">Active shift now:</span> {activeShift}. Available and unavailable
          can only be set for crew whose assigned shift matches this window (drivers and nurses).
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-blue-900">{summary.total}</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mt-1">
              Crew members
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-emerald-900">{summary.present}</p>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mt-1">
              Available today
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-red-900">{summary.absent}</p>
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mt-1">
              Unavailable today
            </p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-violet-900">
                {summary.presentPercentage ?? 0}%
              </p>
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 mt-1">
              Availability rate
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-slate-900">
                {summary.absentPercentage ?? 0}%
              </p>
              <UserX className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">
              Unavailability rate
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              className="w-full pl-9 h-10 rounded-xl border border-gray-200 text-sm font-medium"
              placeholder="Search name, ID, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Present' | 'Absent')}
          >
            <option value="all">All statuses</option>
            <option value="Present">Available</option>
            <option value="Absent">Unavailable</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase text-gray-400 border-b bg-gray-50/80">
                  <th className="p-3">Employee</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Shift start</th>
                  <th className="p-3">Shift end</th>
                  <th className="p-3">Hours on shift</th>
                  <th className="p-3">Availability</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-400">
                      No crew availability records match your filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const photo = profilePhotoUrl(r.profilePhoto)
                    return (
                      <tr
                        key={r.employeeDbId}
                        className={`border-b border-gray-50 hover:bg-gray-50/80 ${
                          r.absent ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                              {photo ? (
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                  {r.employeeName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-gray-900">{r.employeeName}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-600">{r.employeeId}</td>
                        <td className="p-3">{r.role}</td>
                        <td className="p-3 text-gray-600">{r.department}</td>
                        <td className="p-3">{r.shift}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            {formatClock(r.clockIn)}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {formatClock(r.clockOut)}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-900">{formatHours(r)}</td>
                        <td className="p-3">{statusBadge(r.status)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {!r.present && (
                              <button
                                type="button"
                                disabled={markingId === r.employeeDbId || r.canMarkAttendance === false}
                                onClick={() => markAttendance(r, 'present')}
                                title={
                                  r.canMarkAttendance === false
                                    ? r.attendanceBlockReason ?? 'Not on current shift'
                                    : AVAILABILITY_LABELS.markAvailable
                                }
                                className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Available
                              </button>
                            )}
                            {r.present && (
                              <button
                                type="button"
                                disabled={markingId === r.employeeDbId || r.canMarkAttendance === false}
                                onClick={() => markAttendance(r, 'absent')}
                                title={
                                  r.canMarkAttendance === false
                                    ? r.attendanceBlockReason ?? 'Not on current shift'
                                    : AVAILABILITY_LABELS.markUnavailable
                                }
                                className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Unavailable
                              </button>
                            )}
                            {r.recordId && (
                              <button
                                type="button"
                                onClick={() => setEditRow(r)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                title="Edit times"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editRow && (
        <EditRecordModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => loadDay(selectedDate)}
        />
      )}
    </div>
  )
}
