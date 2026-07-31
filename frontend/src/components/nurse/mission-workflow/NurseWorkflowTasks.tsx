'use client'

import { Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BREATHING_STATUS,
  CONSCIOUSNESS_LEVELS,
  PAIN_LEVEL_OPTIONS,
  TREATMENT_TYPES,
  painLevelLabel,
  PATIENT_HANDOVER_OUTCOMES,
} from '@/lib/nurse/patientCareTypes'
import type { MedicalNotesFieldErrors } from '@/lib/nurse/medicalNotesValidation'
import type { HandoverFieldErrors } from '@/lib/nurse/handoverValidation'
import { AGE_GROUPS } from '@/components/public/hire-ambulance/constants'

type TaskShellProps = {
  title: string
  subtitle?: string
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
  submitButtonType?: 'submit' | 'button'
  children: React.ReactNode
  onPrevious?: () => void
  onNext?: () => void
  previousLabel?: string
  nextLabel?: string
}

export function TaskShell({
  title,
  subtitle,
  saving,
  onSubmit,
  submitLabel,
  submitButtonType = 'submit',
  children,
  onPrevious,
  onNext,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: TaskShellProps) {
  return (
    <form
      onSubmit={(e) => {
        if (submitButtonType === 'button') {
          e.preventDefault()
          return
        }
        onSubmit(e)
      }}
      className="nmw-task-form nmw-task-form--comfortable"
    >
      <div className="nmw-task-head">
        <h4>{title}</h4>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="nurse-form-grid">{children}</div>
      <div className="nmw-task-nav">
        {onPrevious ? (
          <button type="button" className="nurse-btn ghost" onClick={onPrevious} disabled={saving}>
            <ChevronLeft size={16} />
            {previousLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          type={submitButtonType}
          className="nurse-btn primary"
          disabled={saving}
          onClick={submitButtonType === 'button' ? (e) => { e.preventDefault(); onSubmit(e) } : undefined}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {submitLabel}
        </button>
        {onNext ? (
          <button type="button" className="nurse-btn ghost" onClick={onNext} disabled={saving}>
            {nextLabel}
            <ChevronRight size={16} />
          </button>
        ) : (
          <span />
        )}
      </div>
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

type FieldErrorProps = { error?: string }

function FieldError({ error }: FieldErrorProps) {
  if (!error) return null
  return <span className="nurse-field-error">{error}</span>
}

export function AssessmentTaskFields({
  form,
  setForm,
  errors = {},
  readOnly = false,
}: {
  form: AssessmentFormState
  setForm: (f: AssessmentFormState) => void
  errors?: Partial<Record<keyof AssessmentFormState, string>>
  readOnly?: boolean
}) {
  return (
    <>
      <label className="span-2">
        Chief complaint *
        <input
          value={form.chiefComplaint}
          onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          maxLength={500}
          required={!readOnly}
          readOnly={readOnly}
          className={readOnly ? 'readonly' : undefined}
          aria-invalid={Boolean(errors.chiefComplaint)}
        />
        <FieldError error={errors.chiefComplaint} />
      </label>
      <label className="span-2">
        Symptoms
        <textarea
          rows={2}
          value={form.symptoms}
          onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
          maxLength={2000}
          readOnly={readOnly}
          className={readOnly ? 'readonly' : undefined}
          aria-invalid={Boolean(errors.symptoms)}
        />
        <FieldError error={errors.symptoms} />
      </label>
      <label>
        Consciousness level
        {readOnly ? (
          <input value={form.consciousnessLevel} readOnly className="readonly" />
        ) : (
          <select value={form.consciousnessLevel} onChange={(e) => setForm({ ...form, consciousnessLevel: e.target.value })}>
            {CONSCIOUSNESS_LEVELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        Pain level
        {readOnly ? (
          <input value={painLevelLabel(form.painLevel)} readOnly className="readonly" />
        ) : (
          <select value={form.painLevel} onChange={(e) => setForm({ ...form, painLevel: e.target.value })}>
            {PAIN_LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        Breathing status
        {readOnly ? (
          <input value={form.breathingStatus} readOnly className="readonly" />
        ) : (
          <select value={form.breathingStatus} onChange={(e) => setForm({ ...form, breathingStatus: e.target.value })}>
            {BREATHING_STATUS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        Injury description
        <input
          value={form.injuryDescription}
          onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })}
          maxLength={500}
          readOnly={readOnly}
          className={readOnly ? 'readonly' : undefined}
          aria-invalid={Boolean(errors.injuryDescription)}
        />
        <FieldError error={errors.injuryDescription} />
      </label>
      <label className="span-2">
        Assessment notes
        <textarea
          rows={3}
          value={form.assessmentNotes}
          onChange={(e) => setForm({ ...form, assessmentNotes: e.target.value })}
          maxLength={2000}
          readOnly={readOnly}
          className={readOnly ? 'readonly' : undefined}
          aria-invalid={Boolean(errors.assessmentNotes)}
        />
        <FieldError error={errors.assessmentNotes} />
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
  errors = {},
  readOnly = false,
}: {
  form: VitalsFormState
  setForm: (f: VitalsFormState) => void
  errors?: Partial<Record<keyof VitalsFormState, string>>
  readOnly?: boolean
}) {
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  return (
    <>
      <label>
        Blood pressure
        <input
          placeholder={readOnly ? undefined : '120/80'}
          value={form.bloodPressure}
          onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
          inputMode="numeric"
          pattern="\d{2,3}/\d{2,3}"
          aria-invalid={Boolean(errors.bloodPressure)}
          {...ro}
        />
        <FieldError error={errors.bloodPressure} />
      </label>
      <label>
        Pulse rate (bpm)
        <input
          type={readOnly ? 'text' : 'number'}
          min={readOnly ? undefined : 30}
          max={readOnly ? undefined : 220}
          value={form.heartRate}
          onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
          aria-invalid={Boolean(errors.heartRate)}
          {...ro}
        />
        <FieldError error={errors.heartRate} />
      </label>
      <label>
        Temperature (°C)
        <input
          type={readOnly ? 'text' : 'number'}
          step={readOnly ? undefined : '0.1'}
          min={readOnly ? undefined : 30}
          max={readOnly ? undefined : 45}
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          aria-invalid={Boolean(errors.temperature)}
          {...ro}
        />
        <FieldError error={errors.temperature} />
      </label>
      <label>
        Oxygen saturation (%)
        <input
          type={readOnly ? 'text' : 'number'}
          min={readOnly ? undefined : 50}
          max={readOnly ? undefined : 100}
          value={form.oxygenSaturation}
          onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })}
          aria-invalid={Boolean(errors.oxygenSaturation)}
          {...ro}
        />
        <FieldError error={errors.oxygenSaturation} />
      </label>
      <label className="span-2">
        Respiratory rate (/min)
        <input
          type={readOnly ? 'text' : 'number'}
          min={readOnly ? undefined : 4}
          max={readOnly ? undefined : 60}
          value={form.respiratoryRate}
          onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })}
          aria-invalid={Boolean(errors.respiratoryRate)}
          {...ro}
        />
        <FieldError error={errors.respiratoryRate} />
      </label>
    </>
  )
}

export type NotesFormState = { observations: string; condition: string; progress: string }

export function NotesTaskFields({
  form,
  setForm,
  errors = {},
  readOnly = false,
}: {
  form: NotesFormState
  setForm: (f: NotesFormState) => void
  errors?: Partial<Record<keyof NotesFormState, string>>
  readOnly?: boolean
}) {
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  return (
    <>
      <label className="span-2">
        Observations
        <textarea
          rows={2}
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.observations)}
          {...ro}
        />
        <FieldError error={errors.observations} />
      </label>
      <label className="span-2">
        Patient condition
        <textarea
          rows={2}
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.condition)}
          {...ro}
        />
        <FieldError error={errors.condition} />
      </label>
      <label className="span-2">
        Progress update
        <textarea
          rows={2}
          value={form.progress}
          onChange={(e) => setForm({ ...form, progress: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.progress)}
          {...ro}
        />
        <FieldError error={errors.progress} />
      </label>
    </>
  )
}

export type TreatmentFormState = {
  treatmentType: string
  treatmentOtherDetails: string
  medication: string
  notes: string
}

export function TreatmentTaskFields({
  form,
  setForm,
  errors = {},
  readOnly = false,
}: {
  form: TreatmentFormState
  setForm: (f: TreatmentFormState) => void
  errors?: Partial<Record<keyof TreatmentFormState, string>>
  readOnly?: boolean
}) {
  const isOther = form.treatmentType === 'Other'
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}

  return (
    <>
      <label className="span-2">
        Treatment type
        {readOnly ? (
          <input value={form.treatmentType || '—'} readOnly className="readonly" />
        ) : (
          <select value={form.treatmentType} onChange={(e) => setForm({ ...form, treatmentType: e.target.value })}>
            {TREATMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </label>
      {isOther && (
        <label className="span-2">
          Other treatment details *
          <textarea
            rows={2}
            value={form.treatmentOtherDetails}
            onChange={(e) => setForm({ ...form, treatmentOtherDetails: e.target.value })}
            required={!readOnly}
            maxLength={2000}
            placeholder="Describe the treatment given"
            aria-invalid={Boolean(errors.treatmentOtherDetails)}
            {...ro}
          />
          <FieldError error={errors.treatmentOtherDetails} />
        </label>
      )}
      <label className="span-2">
        Medication / details
        <input
          value={form.medication}
          onChange={(e) => setForm({ ...form, medication: e.target.value })}
          maxLength={300}
          aria-invalid={Boolean(errors.medication)}
          {...ro}
        />
        <FieldError error={errors.medication} />
      </label>
      <label className="span-2">
        Notes
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.notes)}
          {...ro}
        />
        <FieldError error={errors.notes} />
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

export type HandoverCaseContext = {
  trackingCode: string
  patientName: string
  pickupLocation: string
  acceptedHospital: string
  priority: string
  dispatcherName: string
}

export type HandoverFormState = {
  acceptedHospital: string
  patientOutcome: string
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
  ageGroup: string
  gender: string
  nationalityType: string
  maritalStatus: string
  driverName: string
  nurseName: string
}

function formatAgeGroupLabel(value: string) {
  return AGE_GROUPS.find((g) => g.value === value)?.label || value || '—'
}

export function HandoverTaskFields({
  form,
  setForm,
  nurseName,
  caseContext,
  readOnly = false,
  errors = {},
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  nurseName?: string
  caseContext?: HandoverCaseContext
  readOnly?: boolean
  errors?: HandoverFieldErrors
}) {
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  const outcomeLabel =
    PATIENT_HANDOVER_OUTCOMES.find((o) => o.value === form.patientOutcome)?.label ?? form.patientOutcome
  const acceptedHospital = caseContext?.acceptedHospital || form.acceptedHospital || '—'

  return (
    <>
      {caseContext && (
        <>
          <p className="nmw-form-section-label span-2">From dispatcher</p>
          <label>
            Case ID
            <input value={caseContext.trackingCode || '—'} readOnly className="readonly" />
          </label>
          <label>
            Priority
            <input value={caseContext.priority || '—'} readOnly className="readonly" />
          </label>
          <label className="span-2">
            Patient name
            <input value={caseContext.patientName || '—'} readOnly className="readonly" />
          </label>
          <label className="span-2">
            Pickup location
            <input value={caseContext.pickupLocation || '—'} readOnly className="readonly" />
          </label>
          <label className="span-2">
            Accepted hospital *
            <input value={acceptedHospital} readOnly className="readonly" aria-invalid={Boolean(errors.acceptedHospital)} />
            <FieldError error={errors.acceptedHospital} />
          </label>
          <label className="span-2">
            Dispatcher
            <input value={caseContext.dispatcherName || '—'} readOnly className="readonly" />
          </label>
        </>
      )}

      <p className="nmw-form-section-label span-2">Patient details</p>
      <label>
        Age group
        {readOnly ? (
          <input value={formatAgeGroupLabel(form.ageGroup)} readOnly className="readonly" />
        ) : (
          <select value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}>
            <option value="">Select…</option>
            {AGE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        Gender
        <input
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
          maxLength={40}
          {...ro}
        />
      </label>
      <label>
        Nationality
        <input
          value={form.nationalityType}
          onChange={(e) => setForm({ ...form, nationalityType: e.target.value })}
          maxLength={80}
          {...ro}
        />
      </label>
      <label>
        Marital status
        <input
          value={form.maritalStatus}
          onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
          maxLength={40}
          {...ro}
        />
      </label>
      <label>
        Driver
        <input
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
          maxLength={120}
          {...ro}
        />
      </label>
      <label>
        Handover nurse
        <input value={nurseName || form.nurseName || ''} readOnly className="readonly" />
      </label>

      <p className="nmw-form-section-label span-2">Handover details</p>
      <label className="span-2">
        Patient status at handover *
        {readOnly ? (
          <input value={outcomeLabel || '—'} readOnly className="readonly" />
        ) : (
          <select
            value={form.patientOutcome}
            onChange={(e) => setForm({ ...form, patientOutcome: e.target.value })}
            required
            aria-invalid={Boolean(errors.patientOutcome)}
          >
            <option value="">Select…</option>
            {PATIENT_HANDOVER_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        <FieldError error={errors.patientOutcome} />
      </label>
      <label className="span-2">
        Patient condition summary
        <textarea
          rows={2}
          value={form.patientCondition}
          onChange={(e) => setForm({ ...form, patientCondition: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.patientCondition)}
          {...ro}
        />
        <FieldError error={errors.patientCondition} />
      </label>
      <label className="span-2">
        Treatment given en route
        <textarea
          rows={2}
          value={form.treatmentGiven}
          onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.treatmentGiven)}
          {...ro}
        />
        <FieldError error={errors.treatmentGiven} />
      </label>
      <label className="span-2">
        Receiving doctor (DR name) *
        <input
          value={form.receivingStaff}
          onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })}
          required={!readOnly}
          maxLength={120}
          aria-invalid={Boolean(errors.receivingStaff)}
          {...ro}
        />
        <FieldError error={errors.receivingStaff} />
      </label>
      <label className="span-2">
        Handover notes
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          maxLength={2000}
          aria-invalid={Boolean(errors.notes)}
          {...ro}
        />
        <FieldError error={errors.notes} />
      </label>
      <label className="span-2">
        Digital signature (full name) *
        <input
          value={form.signature}
          onChange={(e) => setForm({ ...form, signature: e.target.value })}
          required={!readOnly}
          maxLength={120}
          aria-invalid={Boolean(errors.signature)}
          {...ro}
        />
        <FieldError error={errors.signature} />
      </label>
    </>
  )
}

export type MedicalNotesFormState = AssessmentFormState &
  VitalsFormState &
  NotesFormState &
  TreatmentFormState

export function MedicalNotesCombinedFields({
  form,
  setForm,
  errors = {},
  readOnly = false,
}: {
  form: MedicalNotesFormState
  setForm: (f: MedicalNotesFormState) => void
  errors?: MedicalNotesFieldErrors
  readOnly?: boolean
}) {
  return (
    <>
      <p className="nmw-form-section-label span-2">Assessment</p>
      <AssessmentTaskFields form={form} setForm={setForm} errors={errors} readOnly={readOnly} />
      <p className="nmw-form-section-label span-2">Vital signs</p>
      <VitalsTaskFields form={form} setForm={setForm} errors={errors} readOnly={readOnly} />
      <p className="nmw-form-section-label span-2">Clinical notes</p>
      <NotesTaskFields form={form} setForm={setForm} errors={errors} readOnly={readOnly} />
      <p className="nmw-form-section-label span-2">Treatment (if given)</p>
      <TreatmentTaskFields form={form} setForm={setForm} errors={errors} readOnly={readOnly} />
    </>
  )
}
