'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  UserX,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { employeeAttendanceService } from '@/lib/api'
import { profilePhotoUrl } from '@/lib/profilePhoto'

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
  const present = status === 'Present'
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
        present ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {present ? 'Present' : 'Absent'}
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
      toast.error('No attendance record to update')
      return
    }
    setSaving(true)
    try {
      await employeeAttendanceService.updateRecord(row.recordId, {
        checkIn: clockIn ? new Date(clockIn).toISOString() : undefined,
        checkOut: clockOut ? new Date(clockOut).toISOString() : null,
        status: clockIn ? 'ON_TIME' : 'ABSENT',
      })
      toast.success('Attendance updated')
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
        <h3 className="text-lg font-black text-gray-900">Edit Attendance</h3>
        <p className="text-sm text-gray-500">{row.employeeName} · {row.employeeId}</p>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-500">Check In</span>
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold uppercase text-gray-500">Check Out</span>
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
  const [summary, setSummary] = useState<{ total: number; present: number; absent: number } | null>(
    null,
  )
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Present' | 'Absent'>('all')
  const [editRow, setEditRow] = useState<AttendanceRow | null>(null)

  const loadDay = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await employeeAttendanceService.getByDay(date)
      setRows(res.items ?? [])
      setSummary(res.summary ?? null)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDay(selectedDate)
  }, [selectedDate, loadDay])

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
    () => [...new Set(rows.map((r) => r.role).filter(Boolean))].sort(),
    [rows],
  )

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Employee Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Present or absent status with actual check-in and check-out times
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            onClick={() => downloadCsv(filtered, `attendance-${selectedDate}.csv`)}
            className="bg-red-600 hover:bg-red-700 rounded-xl h-10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-blue-900">{summary.total}</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mt-1">
              Total Employees
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-emerald-900">{summary.present}</p>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mt-1">
              Present
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-red-900">{summary.absent}</p>
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mt-1">
              Absent
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
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
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
                  <th className="p-3">Check In</th>
                  <th className="p-3">Check Out</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-400">
                      No attendance records match your filters
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
