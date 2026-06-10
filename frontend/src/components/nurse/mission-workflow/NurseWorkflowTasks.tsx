'use client'

import { Loader2, Save } from 'lucide-react'
import {
  BREATHING_STATUS,
  CONSCIOUSNESS_LEVELS,
  PAIN_LEVELS,
  TREATMENT_TYPES,
} from '@/lib/nurse/patientCareTypes'

type TaskShellProps = {
  title: string
  subtitle?: string
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  children: React.ReactNode
}

export function TaskShell({ title, subtitle, saving, onSubmit, submitLabel, children }: TaskShellProps) {
  return (
    <form onSubmit={onSubmit} className="nmw-task-form">
      <div className="nmw-task-head">
        <h4>{title}</h4>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="nurse-form-grid">{children}</div>
      <button type="submit" className="nurse-btn primary w-full" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        {submitLabel}
      </button>
    </form>
  )
}

export type AssessmentFormState = {
  chiefComplaint: string
  symptoms: string
  consciousnessLevel: string
  painLevel: string
  breathingStatus: string
  injuryDescription: string
  assessmentNotes: string
}

export function AssessmentTaskFields({
  form,
  setForm,
}: {
  form: AssessmentFormState
  setForm: (f: AssessmentFormState) => void
}) {
  return (
    <>
      <label className="span-2">
        Chief complaint *
        <input
          value={form.chiefComplaint}
          onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          required
        />
      </label>
      <label className="span-2">
        Symptoms
        <textarea rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
      </label>
      <label>
        Consciousness level
        <select value={form.consciousnessLevel} onChange={(e) => setForm({ ...form, consciousnessLevel: e.target.value })}>
          {CONSCIOUSNESS_LEVELS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Pain level (0–10)
        <select value={form.painLevel} onChange={(e) => setForm({ ...form, painLevel: e.target.value })}>
          {PAIN_LEVELS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Breathing status
        <select value={form.breathingStatus} onChange={(e) => setForm({ ...form, breathingStatus: e.target.value })}>
          {BREATHING_STATUS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Injury description
        <input value={form.injuryDescription} onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })} />
      </label>
      <label className="span-2">
        Assessment notes
        <textarea rows={3} value={form.assessmentNotes} onChange={(e) => setForm({ ...form, assessmentNotes: e.target.value })} />
      </label>
    </>
  )
}

export type VitalsFormState = {
  bloodPressure: string
  heartRate: string
  temperature: string
  oxygenSaturation: string
  respiratoryRate: string
}

export function VitalsTaskFields({
  form,
  setForm,
}: {
  form: VitalsFormState
  setForm: (f: VitalsFormState) => void
}) {
  return (
    <>
      <label>
        Blood pressure
        <input placeholder="120/80" value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} />
      </label>
      <label>
        Pulse rate (bpm)
        <input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />
      </label>
      <label>
        Temperature (°C)
        <input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
      </label>
      <label>
        Oxygen saturation (%)
        <input type="number" value={form.oxygenSaturation} onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} />
      </label>
      <label className="span-2">
        Respiratory rate (/min)
        <input type="number" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
      </label>
    </>
  )
}

export type NotesFormState = { observations: string; condition: string; progress: string }

export function NotesTaskFields({
  form,
  setForm,
}: {
  form: NotesFormState
  setForm: (f: NotesFormState) => void
}) {
  return (
    <>
      <label className="span-2">
        Observations
        <textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
      </label>
      <label className="span-2">
        Patient condition
        <textarea rows={2} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
      </label>
      <label className="span-2">
        Progress update
        <textarea rows={2} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
      </label>
    </>
  )
}

export type TreatmentFormState = { treatmentType: string; medication: string; notes: string }

export function TreatmentTaskFields({
  form,
  setForm,
}: {
  form: TreatmentFormState
  setForm: (f: TreatmentFormState) => void
}) {
  return (
    <>
      <label className="span-2">
        Treatment type
        <select value={form.treatmentType} onChange={(e) => setForm({ ...form, treatmentType: e.target.value })}>
          {TREATMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Medication / details
        <input value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })} />
      </label>
      <label className="span-2">
        Notes
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
    </>
  )
}

export type MonitoringFormState = VitalsFormState & { condition: string; notes: string }

export function MonitoringTaskFields({
  form,
  setForm,
}: {
  form: MonitoringFormState
  setForm: (f: MonitoringFormState) => void
}) {
  return (
    <>
      <VitalsTaskFields form={form} setForm={setForm} />
      <label className="span-2">
        Current condition
        <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
      </label>
      <label className="span-2">
        Monitoring notes
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
    </>
  )
}

export type HandoverFormState = {
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
}

export function HandoverTaskFields({
  form,
  setForm,
  nurseName,
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  nurseName?: string
}) {
  return (
    <>
      <label className="span-2">
        Patient condition summary
        <textarea rows={2} value={form.patientCondition} onChange={(e) => setForm({ ...form, patientCondition: e.target.value })} />
      </label>
      <label className="span-2">
        Treatment given en route
        <textarea rows={2} value={form.treatmentGiven} onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })} />
      </label>
      <label>
        Receiving doctor / nurse
        <input value={form.receivingStaff} onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })} required />
      </label>
      <label>
        Handover nurse
        <input value={nurseName || ''} readOnly className="readonly" />
      </label>
      <label className="span-2">
        Handover notes
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      <label className="span-2">
        Digital signature (full name) *
        <input value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} required />
      </label>
    </>
  )
}
