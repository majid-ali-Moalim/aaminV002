'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  Search,
  UserX,
  Users,
  AlertTriangle,
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
  status: string
  present: boolean
  absent: boolean
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  shiftStatus?: string
  profilePhoto?: string | null
}

function KpiCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string
  value: string | number
  accent?: string
  icon?: React.ElementType
}) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  }
  const cls = colors[accent ?? 'blue'] ?? colors.blue
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xl font-black">{value}</p>
        {Icon && <Icon className="w-5 h-5 opacity-70" />}
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">{label}</p>
    </div>
  )
}

function statusBadge(status: string) {
  const s = status.toLowerCase()
  let cls = 'bg-gray-100 text-gray-700'
  if (s.includes('present')) cls = 'bg-emerald-100 text-emerald-700'
  else if (s.includes('late')) cls = 'bg-amber-100 text-amber-700'
  else if (s.includes('absent')) cls = 'bg-red-100 text-red-700'
  else if (s.includes('leave')) cls = 'bg-blue-100 text-blue-700'
  else if (s.includes('mission')) cls = 'bg-violet-100 text-violet-700'
  else if (s.includes('off')) cls = 'bg-slate-100 text-slate-600'
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  )
}

function filterRows(
  rows: AttendanceRow[],
  search: string,
  role: string,
  statusFilter: string,
  group: 'all' | 'present' | 'absent',
) {
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
  if (statusFilter) list = list.filter((r) => r.status === statusFilter)
  if (group === 'present') list = list.filter((r) => r.present)
  if (group === 'absent') list = list.filter((r) => r.absent || r.status === 'Absent')
  return list
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
    'phone',
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
          const v = (r as Record<string, unknown>)[k]
          const s = v == null ? '' : k.includes('clock') && v ? format(new Date(String(v)), 'HH:mm') : String(v)
          return `"${s.replace(/"/g, '""')}"`
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

function AttendanceTable({ rows, emptyLabel }: { rows: AttendanceRow[]; emptyLabel: string }) {
  if (!rows.length) {
    return <p className="text-center text-gray-400 py-12 text-sm">{emptyLabel}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase text-gray-400 border-b bg-gray-50/80">
            <th className="p-3">Employee</th>
            <th className="p-3">ID</th>
            <th className="p-3">Role</th>
            <th className="p-3">Department</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Shift</th>
            <th className="p-3">Clock In</th>
            <th className="p-3">Clock Out</th>
            <th className="p-3">Hours</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const photo = profilePhotoUrl(r.profilePhoto)
            return (
              <tr
                key={`${r.employeeDbId}-${r.recordId ?? 'x'}`}
                className={`border-b border-gray-50 hover:bg-gray-50/80 ${
                  r.absent || r.status === 'Absent' ? 'bg-red-50/30' : ''
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
                <td className="p-3 text-gray-600">{r.phone}</td>
                <td className="p-3">{r.shift}</td>
                <td className="p-3">{r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—'}</td>
                <td className="p-3">{r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—'}</td>
                <td className="p-3">{r.totalHours ?? '—'}</td>
                <td className="p-3">{statusBadge(r.status)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FilterBar({
  search,
  setSearch,
  role,
  setRole,
  statusFilter,
  setStatusFilter,
  group,
  setGroup,
}: {
  search: string
  setSearch: (v: string) => void
  role: string
  setRole: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  group: 'all' | 'present' | 'absent'
  setGroup: (v: 'all' | 'present' | 'absent') => void
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
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
        <option value="Driver">Driver</option>
        <option value="Nurse">Nurse</option>
        <option value="Dispatcher">Dispatcher</option>
        <option value="Administrator">Administrator</option>
      </select>
      <select
        className="h-10 px-3 rounded-xl border border-gray-200 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="Present">Present</option>
        <option value="Late">Late</option>
        <option value="Absent">Absent</option>
        <option value="On Leave">On Leave</option>
        <option value="On Mission">On Mission</option>
        <option value="Off Duty">Off Duty</option>
      </select>
      <div className="flex rounded-xl border border-gray-200 overflow-hidden">
        {(['all', 'present', 'absent'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`px-3 py-2 text-xs font-bold capitalize ${
              group === g ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function EmployeeAttendanceView() {
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const [loading, setLoading] = useState(true)
  const [todayData, setTodayData] = useState<AttendanceRow[]>([])
  const [todaySummary, setTodaySummary] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [dayData, setDayData] = useState<AttendanceRow[]>([])
  const [daySummary, setDaySummary] = useState<any>(null)
  const [dayLoading, setDayLoading] = useState(false)

  const [searchToday, setSearchToday] = useState('')
  const [roleToday, setRoleToday] = useState('')
  const [statusToday, setStatusToday] = useState('')
  const [groupToday, setGroupToday] = useState<'all' | 'present' | 'absent'>('all')

  const [searchDay, setSearchDay] = useState('')
  const [roleDay, setRoleDay] = useState('')
  const [statusDay, setStatusDay] = useState('')
  const [groupDay, setGroupDay] = useState<'all' | 'present' | 'absent'>('all')

  const loadToday = useCallback(async () => {
    const res = await employeeAttendanceService.getToday()
    setTodayData(res.items ?? [])
    setTodaySummary(res.summary ?? null)
  }, [])

  const loadDay = useCallback(async (date: string) => {
    setDayLoading(true)
    try {
      const res = await employeeAttendanceService.getByDay(date)
      setDayData(res.items ?? [])
      setDaySummary(res.summary ?? null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load attendance for date')
    } finally {
      setDayLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadToday(), loadDay(selectedDate)])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [loadToday, loadDay, selectedDate])

  const dateInitialized = useRef(false)

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  useEffect(() => {
    if (!dateInitialized.current) {
      dateInitialized.current = true
      return
    }
    loadDay(selectedDate)
  }, [selectedDate, loadDay])

  const filteredToday = useMemo(
    () => filterRows(todayData, searchToday, roleToday, statusToday, groupToday),
    [todayData, searchToday, roleToday, statusToday, groupToday],
  )

  const filteredDay = useMemo(
    () => filterRows(dayData, searchDay, roleDay, statusDay, groupDay),
    [dayData, searchDay, roleDay, statusDay, groupDay],
  )

  const presentToday = todayData.filter((r) => r.present)
  const absentToday = todayData.filter((r) => r.absent || r.status === 'Absent')

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Employee Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            All staff — present and absent — for today and any selected date
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAll} className="rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => downloadCsv(filteredDay, `attendance-${selectedDate}.csv`)}
            className="bg-red-600 hover:bg-red-700 rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {todaySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Employees" value={todaySummary.total} icon={Users} accent="blue" />
          <KpiCard label="Present Today" value={todaySummary.present} icon={CheckCircle2} accent="green" />
          <KpiCard label="Absent Today" value={todaySummary.absent} icon={UserX} accent="red" />
          <KpiCard label="Late" value={todaySummary.late} icon={Clock} accent="amber" />
          <KpiCard label="On Leave" value={todaySummary.onLeave} accent="blue" />
          <KpiCard label="On Mission" value={todaySummary.onMission} accent="slate" />
        </div>
      )}

      {/* Section 1: Today's Attendance */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
              Today&apos;s Attendance
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} · {presentToday.length} present ·{' '}
              {absentToday.length} absent
            </p>
          </div>
        </div>
        <div className="p-4 border-b border-gray-50">
          <FilterBar
            search={searchToday}
            setSearch={setSearchToday}
            role={roleToday}
            setRole={setRoleToday}
            statusFilter={statusToday}
            setStatusFilter={setStatusToday}
            group={groupToday}
            setGroup={setGroupToday}
          />
        </div>
        <AttendanceTable
          rows={filteredToday}
          emptyLabel="No employees match your filters for today"
        />
      </section>

      {/* Section 2: Attendance by date (calendar) */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
              Attendance by Date
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pick any day to see who was present or absent
              {daySummary &&
                ` · ${daySummary.present} present · ${daySummary.absent} absent`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-600" />
            <input
              type="date"
              className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-bold"
              value={selectedDate}
              max={todayIso}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setSelectedDate(todayIso)}
            >
              Today
            </Button>
          </div>
        </div>
        <div className="p-4 border-b border-gray-50">
          <FilterBar
            search={searchDay}
            setSearch={setSearchDay}
            role={roleDay}
            setRole={setRoleDay}
            statusFilter={statusDay}
            setStatusFilter={setStatusDay}
            group={groupDay}
            setGroup={setGroupDay}
          />
        </div>
        {dayLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        ) : (
          <>
            {daySummary && selectedDate !== todayIso && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 border-b border-gray-50">
                <KpiCard label="Present" value={daySummary.present} accent="green" />
                <KpiCard label="Absent" value={daySummary.absent} accent="red" />
                <KpiCard label="Late" value={daySummary.late} accent="amber" />
                <KpiCard label="Total" value={daySummary.total} accent="blue" />
              </div>
            )}
            <AttendanceTable
              rows={filteredDay}
              emptyLabel={`No employees match filters for ${format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy')}`}
            />
          </>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <h3 className="text-xs font-black uppercase text-emerald-800 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Present today ({presentToday.length})
          </h3>
          <ul className="text-sm text-emerald-900 space-y-1 max-h-40 overflow-y-auto">
            {presentToday.map((e) => (
              <li key={e.employeeDbId}>
                <span className="font-bold">{e.employeeName}</span>
                <span className="text-emerald-700/80 text-xs ml-2">{e.role}</span>
              </li>
            ))}
            {!presentToday.length && <li className="text-emerald-700/60">None</li>}
          </ul>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <h3 className="text-xs font-black uppercase text-red-800 mb-2 flex items-center gap-1">
            <UserX className="w-4 h-4" /> Absent today ({absentToday.length})
          </h3>
          <ul className="text-sm text-red-900 space-y-1 max-h-40 overflow-y-auto">
            {absentToday.map((e) => (
              <li key={e.employeeDbId}>
                <span className="font-bold">{e.employeeName}</span>
                <span className="text-red-700/80 text-xs ml-2">
                  {e.role} · {e.department}
                </span>
              </li>
            ))}
            {!absentToday.length && <li className="text-red-700/60">None</li>}
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 inline mr-1" />
        Every active employee appears in both sections. Absent means no clock-in for that day. Use
        the calendar to review past days. Filters apply separately to each section.
      </div>
    </div>
  )
}
