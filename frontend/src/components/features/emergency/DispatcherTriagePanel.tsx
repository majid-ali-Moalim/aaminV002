'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Loader2,
  Phone,
  Save,
  Stethoscope,
  Truck,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import type { EmergencyRequest, Priority } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import {
  buildCallerReport,
  BREATHING_UI_OPTIONS,
  normalizeBreathingStatus,
  triageOptionLabel,
  type CallerReportRow,
} from '@/lib/emergency/callerReport'
import {
  BLEEDING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
  TRIAGE_PRIORITY_OPTIONS,
} from '@/lib/emergency/triageOptions'
import CaseStationSummary from '@/components/features/emergency/CaseStationSummary'

type TriageForm = {
  priority: Priority
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  patientCondition: string
  symptoms: string
  manualDispatchNotes: string
}

type IntakeSnapshot = {
  priority: Priority
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  report: CallerReportRow[]
}

function snapshotFromRequest(request: EmergencyRequest): IntakeSnapshot {
  return {
    priority: request.priority,
    consciousStatus: request.consciousStatus || 'CONSCIOUS',
    breathingStatus: normalizeBreathingStatus(request.breathingStatus),
    bleedingStatus: request.bleedingStatus || 'NONE',
    report: buildCallerReport(request),
  }
}

function formFromRequest(request: EmergencyRequest): TriageForm {
  return {
    priority: request.priority,
    consciousStatus: request.consciousStatus || 'CONSCIOUS',
    breathingStatus: normalizeBreathingStatus(request.breathingStatus),
    bleedingStatus: request.bleedingStatus || 'NONE',
    patientCondition: request.patientCondition || '',
    symptoms: request.symptoms || '',
    manualDispatchNotes: request.manualDispatchNotes || '',
  }
}

function StatusOptionGroup({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-500 mt-0.5">{hint}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                selected
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-sm ring-2 ring-red-500/15'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Props = {
  request: EmergencyRequest
  onSaved: (updated: EmergencyRequest) => void
  onAssign: () => void
}

export default function DispatcherTriagePanel({ request, onSaved, onAssign }: Props) {
  const [form, setForm] = useState<TriageForm>(() => formFromRequest(request))
  const [intake, setIntake] = useState<IntakeSnapshot>(() => snapshotFromRequest(request))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIntake(snapshotFromRequest(request))
    setForm(formFromRequest(request))
  }, [request.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await emergencyRequestsService.update(request.id, {
        priority: form.priority,
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientCondition: form.patientCondition.trim() || null,
        symptoms: form.symptoms.trim() || null,
        manualDispatchNotes: form.manualDispatchNotes.trim() || null,
      })
      toast.success('Triage assessment saved')
      onSaved({
        ...request,
        ...updated,
        priority: form.priority,
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientCondition: form.patientCondition.trim() || null,
        symptoms: form.symptoms.trim() || null,
        manualDispatchNotes: form.manualDispatchNotes.trim() || null,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save triage assessment')
    } finally {
      setSaving(false)
    }
  }

  const priorityChanged = form.priority !== intake.priority
  const statusChanged =
    form.consciousStatus !== intake.consciousStatus ||
    form.breathingStatus !== intake.breathingStatus ||
    form.bleedingStatus !== intake.bleedingStatus

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Caller reported — full detail
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Original information from the caller or online form. Review before updating your assessment below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Reported priority:</span>
            <PriorityBadge priority={intake.priority} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {intake.report.map((row) => (
            <div
              key={`${row.label}-${row.value.slice(0, 24)}`}
              className={`rounded-xl border border-slate-100 bg-white p-3 ${
                row.label === 'Full request notes' ? 'md:col-span-2' : ''
              }`}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {row.label}
              </p>
              <p
                className={`text-sm text-slate-800 leading-relaxed ${
                  row.label === 'Full request notes' ? 'whitespace-pre-wrap' : ''
                }`}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>

        {(request.callerPhone || request.patient?.phone) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {request.callerPhone && (
              <a
                href={`tel:${request.callerPhone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Phone className="w-3.5 h-3.5" />
                Call caller
              </a>
            )}
            {request.patient?.phone && request.patient.phone !== request.callerPhone && (
              <a
                href={`tel:${request.patient.phone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <User className="w-3.5 h-3.5" />
                Call patient
              </a>
            )}
          </div>
        )}
      </section>

      <CaseStationSummary request={request} />

      <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Dispatcher / admin review</p>
            <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
              Verify the caller report, update patient status if needed, and set the assessed priority
              based on your understanding before assigning a crew.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-red-500" />
          Assessed priority
        </h3>
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Current badge:</span>
            <PriorityBadge priority={form.priority} size="md" />
            {priorityChanged && (
              <span className="text-[10px] font-bold text-amber-600 uppercase">
                Updated from caller report
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Caller reported:</span>
            <PriorityBadge priority={intake.priority} size="sm" />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Select the priority that matches your assessment. Save to apply the updated badge to this case.
        </p>
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

      <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-red-500" />
            Patient status check
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Tap the option that matches what you confirmed with the caller. Changes apply when you save.
          </p>
          {statusChanged && (
            <p className="text-[10px] font-bold text-amber-600 uppercase mt-2">
              Status updated from caller report
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatusOptionGroup
            label="Conscious"
            hint="Is the patient awake and responsive?"
            value={form.consciousStatus}
            options={CONSCIOUS_STATUS_OPTIONS}
            onChange={(consciousStatus) => setForm((f) => ({ ...f, consciousStatus }))}
          />
          <StatusOptionGroup
            label="Breathing"
            hint="How is the patient breathing?"
            value={form.breathingStatus}
            options={BREATHING_UI_OPTIONS}
            onChange={(breathingStatus) => setForm((f) => ({ ...f, breathingStatus }))}
          />
          <StatusOptionGroup
            label="Bleeding"
            hint="Any visible bleeding?"
            value={form.bleedingStatus}
            options={BLEEDING_STATUS_OPTIONS}
            onChange={(bleedingStatus) => setForm((f) => ({ ...f, bleedingStatus }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-800">Condition summary (verified)</span>
            <textarea
              value={form.patientCondition}
              onChange={(e) => setForm((f) => ({ ...f, patientCondition: e.target.value }))}
              rows={4}
              placeholder="Document what you confirmed with the caller…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y min-h-[100px]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-slate-800">Symptoms (verified)</span>
            <textarea
              value={form.symptoms}
              onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
              rows={4}
              placeholder="Symptoms reported or observed…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y min-h-[100px]"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-slate-800">Dispatcher / admin notes</span>
          <textarea
            value={form.manualDispatchNotes}
            onChange={(e) => setForm((f) => ({ ...f, manualDispatchNotes: e.target.value }))}
            rows={2}
            placeholder="Internal notes for the response crew…"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y"
          />
        </label>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
          <span className="font-bold text-slate-700">Caller reported status: </span>
          {triageOptionLabel(CONSCIOUS_STATUS_OPTIONS, intake.consciousStatus)} ·{' '}
          {triageOptionLabel(BREATHING_UI_OPTIONS, intake.breathingStatus)} ·{' '}
          {triageOptionLabel(BLEEDING_STATUS_OPTIONS, intake.bleedingStatus)}
        </div>
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
