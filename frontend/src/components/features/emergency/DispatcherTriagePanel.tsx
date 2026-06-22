'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  Save,
  Stethoscope,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import type { EmergencyRequest, Priority } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
  TRIAGE_PRIORITY_OPTIONS,
} from '@/lib/emergency/triageOptions'

type TriageForm = {
  priority: Priority
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  patientCondition: string
  manualDispatchNotes: string
}

function formFromRequest(request: EmergencyRequest): TriageForm {
  return {
    priority: request.priority,
    consciousStatus: request.consciousStatus || 'CONSCIOUS',
    breathingStatus: request.breathingStatus || 'NORMAL',
    bleedingStatus: request.bleedingStatus || 'NONE',
    patientCondition: request.patientCondition || request.symptoms || '',
    manualDispatchNotes: request.manualDispatchNotes || '',
  }
}

type Props = {
  request: EmergencyRequest
  onSaved: (updated: EmergencyRequest) => void
  onAssign: () => void
}

export default function DispatcherTriagePanel({ request, onSaved, onAssign }: Props) {
  const [form, setForm] = useState<TriageForm>(() => formFromRequest(request))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(formFromRequest(request))
  }, [request.id, request.updatedAt])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await emergencyRequestsService.update(request.id, {
        priority: form.priority,
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientCondition: form.patientCondition.trim() || null,
        manualDispatchNotes: form.manualDispatchNotes.trim() || null,
      })
      toast.success('Triage assessment saved')
      onSaved({ ...request, ...updated, priority: form.priority })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save triage assessment')
    } finally {
      setSaving(false)
    }
  }

  const priorityChanged = form.priority !== request.priority

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Dispatcher review required</p>
            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
              The caller may report a critical situation. Verify conscious status, breathing, and
              bleeding, then set the assessed priority before assigning ambulance, driver, and nurse.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-red-500" />
          Assessed priority
        </h3>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-slate-500">Current badge:</span>
          <PriorityBadge priority={request.priority} />
          {priorityChanged && (
            <span className="text-[10px] font-bold text-amber-600 uppercase">→ will change on save</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TRIAGE_PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, priority: opt.value }))}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.priority === opt.value
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20'
                  : 'border-slate-200 bg-slate-50 hover:border-red-200'
              }`}
            >
              <p className="text-sm font-black text-slate-900">{opt.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{opt.hint}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-red-500" />
          Patient status check
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Conscious
            <select
              value={form.consciousStatus}
              onChange={(e) => setForm((f) => ({ ...f, consciousStatus: e.target.value }))}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10"
            >
              {CONSCIOUS_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase">
            Breathing
            <select
              value={form.breathingStatus}
              onChange={(e) => setForm((f) => ({ ...f, breathingStatus: e.target.value }))}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10"
            >
              {BREATHING_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase">
            Bleeding
            <select
              value={form.bleedingStatus}
              onChange={(e) => setForm((f) => ({ ...f, bleedingStatus: e.target.value }))}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10"
            >
              {BLEEDING_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-500 uppercase">
          Condition / symptoms (verified)
          <textarea
            value={form.patientCondition}
            onChange={(e) => setForm((f) => ({ ...f, patientCondition: e.target.value }))}
            rows={3}
            placeholder="Document what the dispatcher confirmed with the caller…"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y min-h-[80px]"
          />
        </label>
        <label className="block text-xs font-bold text-slate-500 uppercase">
          Dispatcher notes
          <textarea
            value={form.manualDispatchNotes}
            onChange={(e) => setForm((f) => ({ ...f, manualDispatchNotes: e.target.value }))}
            rows={2}
            placeholder="Internal notes for the response crew…"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y"
          />
        </label>
      </section>

      <PickupGpsPanel request={request} variant="compact" />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12 rounded-xl font-bold border-slate-200"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save assessment
        </Button>
        <Button
          type="button"
          onClick={onAssign}
          className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 font-black shadow-lg shadow-red-200"
        >
          <Truck className="w-4 h-4 mr-2" />
          Assign crew
        </Button>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <ClipboardCheck className="w-3.5 h-3.5" />
        Save triage first, then assign ambulance with driver and nurse.
      </p>
    </div>
  )
}
