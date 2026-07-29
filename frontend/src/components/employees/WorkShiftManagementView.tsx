'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  Stethoscope,
  Radio,
  Users,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { employeeAttendanceService } from '@/lib/api'
import { displayAttendanceFlag } from '@/lib/availability/labels'
import { FIELD_SHIFT_ROLES, WORK_SHIFT_TEMPLATES, activeShiftLabel } from '@/lib/employment/shiftTypes'

type RoleBreakdown = {
  drivers: number
  nurses: number
  dispatchers: number
}

type ShiftEmployee = {
  id: string
  name: string
  code?: string | null
  role?: string
  roleBucket?: string
  present?: boolean
  onCurrentShift?: boolean
  dispatchEligible?: boolean
}

type FieldStaffRow = ShiftEmployee & {
  shiftCode: 'DAY' | 'NIGHT'
  shiftName: string
}

type WorkShift = {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  description?: string | null
  gracePeriodMins: number
  color?: string | null
  isActive: boolean
  durationHours?: number
  assignedCount?: number
  roleBreakdown?: RoleBreakdown
  assignedEmployees?: ShiftEmployee[]
}

type ShiftForm = {
  code: string
  name: string
  startTime: string
  endTime: string
  description: string
  gracePeriodMins: number
  color: string
  isActive: boolean
}

const ROLE_META = [
  { key: 'drivers' as const, label: 'Drivers', icon: Truck, className: 'bg-red-50 text-red-700 border-red-100' },
  { key: 'nurses' as const, label: 'Nurses', icon: Stethoscope, className: 'bg-violet-50 text-violet-700 border-violet-100' },
  { key: 'dispatchers' as const, label: 'Dispatchers', icon: Radio, className: 'bg-blue-50 text-blue-700 border-blue-100' },
]

function templateForm(code: 'DAY' | 'NIGHT'): ShiftForm {
  const t = WORK_SHIFT_TEMPLATES.find((s) => s.code === code) ?? WORK_SHIFT_TEMPLATES[0]
  return {
    code: t.code,
    name: t.name,
    startTime: t.startTime,
    endTime: t.endTime,
    description: t.description,
    gracePeriodMins: 15,
    color: t.color,
    isActive: true,
  }
}

function StaffBadges({ row }: { row: ShiftEmployee }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span
        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          row.present ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {displayAttendanceFlag(row.present)}
      </span>
      <span
        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          row.onCurrentShift ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {row.onCurrentShift ? 'On active shift' : 'Other shift'}
      </span>
      {row.dispatchEligible && (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          Dispatch ready
        </span>
      )}
    </div>
  )
}

export default function WorkShiftManagementView() {
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [fieldStaff, setFieldStaff] = useState<FieldStaffRow[]>([])
  const [currentActiveShift, setCurrentActiveShift] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkShift | null>(null)
  const [form, setForm] = useState<ShiftForm>(templateForm('DAY'))
  const [saving, setSaving] = useState(false)
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'drivers' | 'nurses' | 'dispatchers'>('all')

  const existingCodes = useMemo(() => new Set(shifts.map((s) => s.code.toUpperCase())), [shifts])
  const availableTemplates = useMemo(
    () => WORK_SHIFT_TEMPLATES.filter((t) => !existingCodes.has(t.code)),
    [existingCodes],
  )

  const otherShiftCode = (code: string): 'DAY' | 'NIGHT' =>
    code.toUpperCase() === 'NIGHT' ? 'DAY' : 'NIGHT'

  const otherShiftName = (code: string) =>
    WORK_SHIFT_TEMPLATES.find((t) => t.code === otherShiftCode(code))?.name ?? 'Other shift'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await employeeAttendanceService.getShifts()
      setShifts(Array.isArray(data?.shifts) ? data.shifts : [])
      setFieldStaff(Array.isArray(data?.fieldStaff) ? data.fieldStaff : [])
      setCurrentActiveShift(data?.activeShiftLabel ?? activeShiftLabel())
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredStaff = useMemo(() => {
    if (roleFilter === 'all') return fieldStaff
    return fieldStaff.filter((s) => s.roleBucket === roleFilter)
  }, [fieldStaff, roleFilter])

  const reassignEmployee = async (employeeId: string, shiftCode: 'DAY' | 'NIGHT') => {
    setReassigningId(employeeId)
    try {
      await employeeAttendanceService.assignEmployeeShift(employeeId, shiftCode)
      toast.success('Shift assignment updated')
      await load()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to update shift')
    } finally {
      setReassigningId(null)
    }
  }

  const openCreate = (code: 'DAY' | 'NIGHT') => {
    setEditing(null)
    setForm(templateForm(code))
    setModalOpen(true)
  }

  const openEdit = (shift: WorkShift) => {
    setEditing(shift)
    setForm({
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description ?? '',
      gracePeriodMins: shift.gracePeriodMins,
      color: shift.color ?? '#EF2D2D',
      isActive: shift.isActive,
    })
    setModalOpen(true)
  }

  const isCanonical = (code: string) => ['DAY', 'NIGHT'].includes(code.toUpperCase())

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        description: form.description.trim() || undefined,
        gracePeriodMins: form.gracePeriodMins,
        color: form.color,
        ...(editing ? { isActive: form.isActive } : {}),
      }
      if (editing) {
        await employeeAttendanceService.updateWorkShift(editing.id, payload)
        toast.success('Shift updated')
      } else {
        await employeeAttendanceService.createWorkShift(payload)
        toast.success('Shift created')
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(message || 'Failed to save shift')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (shift: WorkShift) => {
    if (!confirm(`Deactivate "${shift.name}"?`)) return
    try {
      await employeeAttendanceService.deleteWorkShift(shift.id)
      toast.success('Shift deactivated')
      load()
    } catch {
      toast.error('Failed to deactivate shift')
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Shift Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign drivers, nurses, and dispatchers to day or night shifts. Dispatch team picks only
            staff who are <strong>available</strong> and on the <strong>current active shift</strong>.
          </p>
          <p className="text-xs font-bold text-emerald-700 mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            Active shift now: {currentActiveShift || activeShiftLabel()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {availableTemplates.map((t) => (
            <Button
              key={t.code}
              onClick={() => openCreate(t.code as 'DAY' | 'NIGHT')}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {t.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {shifts.map((shift) => {
              const roles = shift.roleBreakdown ?? { drivers: 0, nurses: 0, dispatchers: 0 }
              const staff = shift.assignedEmployees ?? []
              return (
                <div
                  key={shift.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    shift.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: shift.color ?? '#EF2D2D' }}
                      >
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{shift.name}</p>
                        <p className="text-xs font-mono text-gray-500">{shift.code}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        shift.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="font-bold">
                        {shift.startTime} – {shift.endTime}
                      </span>
                      <span className="text-xs text-gray-400">({shift.durationHours ?? 12} h)</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ROLE_META.map(({ key, label, icon: Icon, className }) => (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}: {roles[key]}
                        </span>
                      ))}
                    </div>

                    {staff.length > 0 ? (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 max-h-56 overflow-y-auto">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2">
                          Staff on this shift
                        </p>
                        <ul className="space-y-2">
                          {staff.map((e) => (
                            <li
                              key={e.id}
                              className="flex items-start justify-between gap-2 rounded-lg bg-white border border-gray-100 p-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-900 truncate">{e.name}</p>
                                <p className="text-[10px] text-gray-500">{e.role}</p>
                                <StaffBadges row={e} />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={reassigningId === e.id}
                                className="shrink-0 h-8 text-[10px] rounded-lg"
                                onClick={() => reassignEmployee(e.id, otherShiftCode(shift.code))}
                              >
                                {reassigningId === e.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <ArrowRightLeft className="w-3 h-3 mr-1" />
                                    {otherShiftName(shift.code)}
                                  </>
                                )}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No staff assigned to this shift yet</p>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg flex-1" onClick={() => openEdit(shift)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    {shift.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => deactivate(shift)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">Reassign field staff by role</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Move any driver, nurse, or dispatcher between {FIELD_SHIFT_ROLES.join(' · ').toLowerCase()}
                </p>
              </div>
              <select
                className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              >
                <option value="all">All roles</option>
                <option value="drivers">Drivers</option>
                <option value="nurses">Nurses</option>
                <option value="dispatchers">Dispatchers</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-[10px] font-black uppercase text-gray-400 bg-gray-50 border-b">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Assigned shift</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Change shift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No field staff found
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-3">
                          <p className="font-bold text-gray-900">{row.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">{row.code}</p>
                        </td>
                        <td className="p-3 text-gray-700">{row.role}</td>
                        <td className="p-3 font-semibold text-gray-800">{row.shiftName}</td>
                        <td className="p-3">
                          <StaffBadges row={row} />
                        </td>
                        <td className="p-3">
                          <select
                            className="h-9 px-2 rounded-lg border border-gray-200 text-xs font-bold min-w-[140px]"
                            value={row.shiftCode}
                            disabled={reassigningId === row.id}
                            onChange={(e) =>
                              reassignEmployee(row.id, e.target.value as 'DAY' | 'NIGHT')
                            }
                          >
                            <option value="DAY">Day time</option>
                            <option value="NIGHT">Night time</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Assign Dispatch Team only lists drivers and nurses marked <strong>available</strong> in
                crew availability whose assigned shift matches the active window ({currentActiveShift || activeShiftLabel()}).
              </span>
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-900">
              {editing ? 'Edit Shift' : 'Create Shift'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-gray-500">Code</span>
                <input
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50"
                  value={form.code}
                  readOnly={isCanonical(form.code)}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-gray-500">Name</span>
                <input
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">Start Time</span>
                <input
                  type="time"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm disabled:bg-gray-50"
                  value={form.startTime}
                  readOnly={isCanonical(form.code)}
                  disabled={isCanonical(form.code)}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">End Time</span>
                <input
                  type="time"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm disabled:bg-gray-50"
                  value={form.endTime}
                  readOnly={isCanonical(form.code)}
                  disabled={isCanonical(form.code)}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-gray-500">Grace (min)</span>
                <input
                  type="number"
                  min={0}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.gracePeriodMins}
                  onChange={(e) => setForm({ ...form, gracePeriodMins: Number(e.target.value) })}
                />
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-gray-500">Color</span>
                <input
                  type="color"
                  className="w-full h-10 rounded-xl border border-gray-200"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-xs font-bold uppercase text-gray-500">Description</span>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              {editing && (
                <label className="flex items-center gap-2 col-span-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Active shift
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 rounded-xl">
                {saving ? 'Saving…' : editing ? 'Update Shift' : 'Create Shift'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
