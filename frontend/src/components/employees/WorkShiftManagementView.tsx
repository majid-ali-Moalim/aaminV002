'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { employeeAttendanceService } from '@/lib/api'

type WorkShift = {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  description?: string | null
  gracePeriodMins: number
  breakMinutes: number
  color?: string | null
  isActive: boolean
}

const emptyForm = {
  code: '',
  name: '',
  startTime: '08:00',
  endTime: '16:00',
  description: '',
  gracePeriodMins: 15,
  breakMinutes: 30,
  color: '#EF2D2D',
  isActive: true,
}

export default function WorkShiftManagementView() {
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WorkShift | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await employeeAttendanceService.listWorkShifts()
      setShifts(Array.isArray(data) ? data : [])
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

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
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
      breakMinutes: shift.breakMinutes,
      color: shift.color ?? '#EF2D2D',
      isActive: shift.isActive,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await employeeAttendanceService.updateWorkShift(editing.id, form)
        toast.success('Shift updated')
      } else {
        await employeeAttendanceService.createWorkShift(form)
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
            Create and update work shifts for drivers, nurses, dispatchers, and staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shifts.map((shift) => (
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

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span className="font-bold">
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>
                {shift.description && (
                  <p className="text-gray-500 text-xs leading-relaxed">{shift.description}</p>
                )}
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>Grace: {shift.gracePeriodMins} min</span>
                  <span>Break: {shift.breakMinutes} min</span>
                </div>
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
          ))}
          {!shifts.length && (
            <div className="col-span-full text-center py-16 text-gray-400 border border-dashed rounded-2xl">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No shifts configured yet
            </div>
          )}
        </div>
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
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="MORNING"
                />
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase text-gray-500">Name</span>
                <input
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Morning Shift"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">Start Time</span>
                <input
                  type="time"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">End Time</span>
                <input
                  type="time"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">Grace (min)</span>
                <input
                  type="number"
                  min={0}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.gracePeriodMins}
                  onChange={(e) => setForm({ ...form, gracePeriodMins: Number(e.target.value) })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase text-gray-500">Break (min)</span>
                <input
                  type="number"
                  min={0}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm"
                  value={form.breakMinutes}
                  onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })}
                />
              </label>
              <label className="space-y-1 col-span-2">
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
