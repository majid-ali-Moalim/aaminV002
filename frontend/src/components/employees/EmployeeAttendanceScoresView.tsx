'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { employeeAttendanceService } from '@/lib/api'
import { staffRoleLabel, type StaffRoleBucket } from '@/lib/employment/shiftTypes'

type EmployeeScore = {
  employeeId: string
  employeeCode: string
  employeeName: string
  role: string
  roleBucket: StaffRoleBucket
  department: string
  presentDays: number
  absentDays: number
  totalDays: number
  attendancePercentage: number
  absencePercentage: number
  score: number
}

type RolePresence = { total: number; present: number; absent: number }

type TodayEmployee = {
  id: string
  name: string
  code: string
  role: string
  roleBucket: StaffRoleBucket
}

type TodayPresence = {
  date: string
  presentEmployees: number
  absentEmployees: number
  totalEmployees: number
  presentPercentage: number
  absentPercentage: number
  byRole: {
    drivers: RolePresence
    nurses: RolePresence
    dispatchers: RolePresence
    admins: RolePresence
  }
  fieldStaff: RolePresence & { presentPercentage: number; absentPercentage: number }
  presentEmployeesList: TodayEmployee[]
  absentEmployeesList: TodayEmployee[]
}

type ScoresResponse = {
  range?: { startDate: string; endDate: string; totalDays: number }
  summary?: {
    totalEmployees: number
    totalPresentDays: number
    totalAbsentDays: number
    averageAttendanceRate: number
    averageAbsenceRate: number
  }
  todayPresence?: TodayPresence
  byRole?: Record<
    string,
    { count: number; averageScore: number; presentDays: number; absentDays: number }
  >
  employees?: EmployeeScore[]
}

const FIELD_ROLE_KEYS: StaffRoleBucket[] = ['drivers', 'nurses', 'dispatchers']

function rolePresenceCard(
  bucket: StaffRoleBucket,
  stats: RolePresence,
  accent: { border: string; bg: string; text: string; sub: string },
) {
  return (
    <div key={bucket} className={`rounded-xl border ${accent.border} ${accent.bg} p-4`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${accent.sub}`}>
        {staffRoleLabel(bucket)} today
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className={`text-2xl font-black ${accent.text}`}>{stats.present}</p>
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Present</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-red-700">{stats.absent}</p>
          <p className="text-[10px] font-bold text-red-600 uppercase">Absent</p>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2">{stats.total} total staff</p>
    </div>
  )
}

function EmployeeChipList({ items, variant }: { items: TodayEmployee[]; variant: 'present' | 'absent' }) {
  if (!items.length) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No {variant} employees today
      </p>
    )
  }

  const grouped = FIELD_ROLE_KEYS.reduce<Record<string, TodayEmployee[]>>((acc, bucket) => {
    acc[bucket] = items.filter((e) => e.roleBucket === bucket)
    return acc
  }, {})
  const admins = items.filter((e) => e.roleBucket === 'admins')

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {FIELD_ROLE_KEYS.map((bucket) => {
        const list = grouped[bucket]
        if (!list?.length) return null
        return (
          <div key={bucket}>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">
              {staffRoleLabel(bucket)} ({list.length})
            </p>
            <ul className="space-y-1">
              {list.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm"
                >
                  <span className="font-semibold text-gray-900 truncate">{e.name}</span>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">{e.code}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {admins.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">
            Admins ({admins.length})
          </p>
          <ul className="space-y-1">
            {admins.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm"
              >
                <span className="font-semibold text-gray-900 truncate">{e.name}</span>
                <span className="text-[10px] font-mono text-gray-500 shrink-0">{e.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function scoreBadge(score: number) {
  let cls = 'bg-red-100 text-red-700'
  if (score >= 90) cls = 'bg-emerald-100 text-emerald-700'
  else if (score >= 75) cls = 'bg-amber-100 text-amber-800'
  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${cls}`}>
      {score.toFixed(1)}%
    </span>
  )
}

function downloadCsv(rows: EmployeeScore[], filename: string) {
  if (!rows.length) {
    toast.error('No data to export')
    return
  }
  const keys = [
    'employeeCode',
    'employeeName',
    'role',
    'department',
    'presentDays',
    'absentDays',
    'totalDays',
    'attendancePercentage',
    'absencePercentage',
    'score',
  ]
  const csv = [
    keys.join(','),
    ...rows.map((r) =>
      keys.map((k) => `"${String((r as Record<string, unknown>)[k] ?? '').toString().replace(/"/g, '""')}"`).join(','),
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

export default function EmployeeAttendanceScoresView() {
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const defaultStart = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(todayIso)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [data, setData] = useState<ScoresResponse | null>(null)

  const loadScores = useCallback(async () => {
    setLoading(true)
    try {
      const res = (await employeeAttendanceService.getScores({
        startDate,
        endDate,
        role: roleFilter || undefined,
      })) as ScoresResponse
      setData(res)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to load attendance scores')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, roleFilter])

  useEffect(() => {
    loadScores()
  }, [loadScores])

  const employees = useMemo(() => {
    let list = data?.employees ?? []
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          String(e.employeeCode).toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q),
      )
    }
    return list
  }, [data?.employees, search])

  const roleOptions = useMemo(
    () =>
      Array.from(new Set((data?.employees ?? []).map((e) => e.role).filter(Boolean))).sort(),
    [data?.employees],
  )

  const summary = data?.summary
  const range = data?.range
  const today = data?.todayPresence

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/employees/attendance"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Daily attendance
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Attendance Scores</h1>
          <p className="text-sm text-gray-500 mt-1">
            Present and absent day totals with attendance percentage for drivers, nurses, dispatchers, and admins
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-10">
            <Calendar className="w-4 h-4 text-red-600" />
            <input
              type="date"
              className="text-sm font-bold outline-none"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              className="text-sm font-bold outline-none"
              value={endDate}
              max={todayIso}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={loadScores} className="rounded-xl h-10">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() =>
              downloadCsv(employees, `attendance-scores-${startDate}-to-${endDate}.csv`)
            }
            className="bg-red-600 hover:bg-red-700 rounded-xl h-10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {today && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900">Today&apos;s attendance</h2>
              <p className="text-xs text-gray-500">{today.date} — live present and absent headcount</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                {today.presentEmployees} present ({today.presentPercentage}%)
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                {today.absentEmployees} absent ({today.absentPercentage}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rolePresenceCard('drivers', today.byRole.drivers, {
              border: 'border-orange-200',
              bg: 'bg-orange-50/80',
              text: 'text-orange-900',
              sub: 'text-orange-700',
            })}
            {rolePresenceCard('nurses', today.byRole.nurses, {
              border: 'border-rose-200',
              bg: 'bg-rose-50/80',
              text: 'text-rose-900',
              sub: 'text-rose-700',
            })}
            {rolePresenceCard('dispatchers', today.byRole.dispatchers, {
              border: 'border-blue-200',
              bg: 'bg-blue-50/80',
              text: 'text-blue-900',
              sub: 'text-blue-700',
            })}
            {rolePresenceCard('admins', today.byRole.admins, {
              border: 'border-violet-200',
              bg: 'bg-violet-50/80',
              text: 'text-violet-900',
              sub: 'text-violet-700',
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-emerald-900">
                  Present employees ({today.presentEmployees})
                </h3>
              </div>
              <EmployeeChipList items={today.presentEmployeesList} variant="present" />
            </div>
            <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-black text-red-900">
                  Absent employees ({today.absentEmployees})
                </h3>
              </div>
              <EmployeeChipList items={today.absentEmployeesList} variant="absent" />
            </div>
          </div>
        </div>
      )}

      {summary && range && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-blue-900">{summary.totalEmployees}</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mt-1">
              Staff employees
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-emerald-900">{summary.totalPresentDays}</p>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mt-1">
              Total present days
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-red-900">{summary.totalAbsentDays}</p>
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mt-1">
              Total absent days
            </p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-violet-900">{summary.averageAttendanceRate}%</p>
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 mt-1">
              Avg attendance rate
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-slate-900">{range.totalDays}</p>
              <BarChart3 className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">
              Days in range
            </p>
          </div>
        </div>
      )}

      {data?.byRole && Object.keys(data.byRole).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(data.byRole) as [StaffRoleBucket, { count: number; averageScore: number }][]).map(
            ([bucket, stats]) => (
              <div
                key={bucket}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="text-xs font-bold text-gray-500 uppercase">{staffRoleLabel(bucket)}</p>
                <p className="text-lg font-black text-gray-900 mt-1">{stats.averageScore}%</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{stats.count} employees</p>
              </div>
            ),
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              className="w-full pl-9 h-10 rounded-xl border border-gray-200 text-sm font-medium"
              placeholder="Search name, ID, or role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All staff roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase text-gray-400 border-b bg-gray-50/80">
                  <th className="p-3">Employee</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Present days</th>
                  <th className="p-3">Absent days</th>
                  <th className="p-3">Total days</th>
                  <th className="p-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      No attendance scores match your filters
                    </td>
                  </tr>
                ) : (
                  employees.map((row) => (
                    <tr key={row.employeeId} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="p-3 font-bold text-gray-900">{row.employeeName}</td>
                      <td className="p-3 font-mono text-xs text-gray-600">{row.employeeCode}</td>
                      <td className="p-3">{row.role}</td>
                      <td className="p-3 text-gray-600">{row.department}</td>
                      <td className="p-3 font-bold text-emerald-700">{row.presentDays}</td>
                      <td className="p-3 font-bold text-red-700">{row.absentDays}</td>
                      <td className="p-3 text-gray-600">{row.totalDays}</td>
                      <td className="p-3">{scoreBadge(row.score)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
