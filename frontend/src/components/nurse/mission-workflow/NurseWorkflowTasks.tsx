'use client'

import { useState } from 'react'
import { Loader2, Save, ChevronLeft, ChevronRight, Plus, Trash2, Upload, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadService } from '@/lib/api'
import {
  HOSPITAL_REFUSAL_REASON_OPTIONS,
  newRejectedHospitalEntry,
  type RejectedHospitalEntry,
} from '@/lib/emergency/buildCaseClosureDefaults'
import {
  BREATHING_STATUS,
  CONSCIOUSNESS_LEVELS,
  PAIN_LEVEL_OPTIONS,
  TREATMENT_TYPES,
  painLevelLabel,
  PATIENT_HANDOVER_OUTCOMES,
  handoverOutcomeLabel,
} from '@/lib/nurse/patientCareTypes'
import type { MedicalNotesFieldErrors } from '@/lib/nurse/medicalNotesValidation'
import type { HandoverFieldErrors } from '@/lib/nurse/handoverValidation'
import { COUNTRY_NAMES } from '@/lib/countries'
import { AGE_GROUPS } from '@/components/public/hire-ambulance/constants'
import { genderOptions } from '@/lib/nurseFormMasterData'
import { formatGender } from '@/lib/patients/patientDisplay'
import { downloadUploadedFile, uploadedFileUrl } from '@/lib/uploads/fileUrl'

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
  rejectedHospitals: RejectedHospitalEntry[]
  patientOutcome: string
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
  handoverDocumentUrl?: string
  handoverDocumentName?: string
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

function GenderField({
  form,
  setForm,
  readOnly,
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  readOnly?: boolean
}) {
  const options = genderOptions()
  if (readOnly) {
    return (
      <label>
        Gender
        <input value={formatGender(form.gender as 'MALE' | 'FEMALE' | undefined) || '—'} readOnly className="readonly" />
      </label>
    )
  }
  return (
    <label>
      Gender
      <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
        <option value="">Select…</option>
        {options.map((g) => (
          <option key={g.id} value={g.id}>{g.label}</option>
        ))}
      </select>
    </label>
  )
}

function refusalReasonLabel(value: string) {
  return HOSPITAL_REFUSAL_REASON_OPTIONS.find((o) => o.value === value)?.label || value || '—'
}

function HandoverRejectedHospitalsSection({
  entries,
  onChange,
  readOnly = false,
  error,
}: {
  entries: RejectedHospitalEntry[]
  onChange: (entries: RejectedHospitalEntry[]) => void
  readOnly?: boolean
  error?: string
}) {
  const addEntry = () => onChange([...entries, newRejectedHospitalEntry()])

  const updateEntry = (id: string, patch: Partial<RejectedHospitalEntry>) => {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
  }

  return (
    <div className="span-2 nmw-rejected-hospitals">
      <div className="nmw-rejected-head">
        <span>
          Rejected hospitals <span className="nmw-optional">(optional)</span>
        </span>
        {!readOnly && (
          <button type="button" className="nurse-btn ghost nmw-add-rejected" onClick={addEntry}>
            <Plus size={14} />
            Add rejected hospital
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="nmw-field-hint">
          {readOnly
            ? 'No rejected hospitals recorded.'
            : 'Hospitals that refused the patient before final destination. Click + to add one.'}
        </p>
      ) : readOnly ? (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={entry.id} className="nmw-rejected-card">
              <div className="nmw-rejected-card-head">
                <span>Rejected hospital #{index + 1}</span>
              </div>
              <label className="span-2">
                Hospital name
                <input value={entry.hospitalName || '—'} readOnly className="readonly" />
              </label>
              <label>
                Refusal reason
                <input value={refusalReasonLabel(entry.reason)} readOnly className="readonly" />
              </label>
              <label>
                Notes
                <input value={entry.notes || '—'} readOnly className="readonly" />
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={entry.id} className="nmw-rejected-card">
              <div className="nmw-rejected-card-head">
                <span>Rejected hospital #{index + 1}</span>
                <button
                  type="button"
                  className="nmw-icon-btn"
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Remove rejected hospital"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <label className="span-2">
                Hospital name
                <input
                  value={entry.hospitalName}
                  onChange={(e) => updateEntry(entry.id, { hospitalName: e.target.value })}
                  maxLength={120}
                  placeholder="Hospital that refused the patient"
                />
              </label>
              <label>
                Refusal reason
                <select
                  value={entry.reason}
                  onChange={(e) => updateEntry(entry.id, { reason: e.target.value })}
                >
                  {HOSPITAL_REFUSAL_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input
                  value={entry.notes}
                  onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                  maxLength={2000}
                  placeholder="Optional details"
                />
              </label>
            </div>
          ))}
        </div>
      )}

      <FieldError error={error} />
    </div>
  )
}

/** Matches the backend upload limit in uploads.controller.ts. */
const MAX_HANDOVER_DOC_BYTES = 5 * 1024 * 1024

export function HandoverDocumentUpload({
  form,
  setForm,
  readOnly = false,
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  readOnly?: boolean
}) {
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleHandoverDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || readOnly) return
    if (file.size > MAX_HANDOVER_DOC_BYTES) {
      toast.error('File must be under 5 MB')
      return
    }
    setUploadingDoc(true)
    try {
      const res = (await uploadService.uploadFile(file)) as { url?: string }
      const url = res?.url
      if (!url) throw new Error('No URL returned')
      setForm({
        ...form,
        handoverDocumentUrl: url,
        handoverDocumentName: file.name,
      })
      toast.success('Handover document uploaded')
    } catch {
      toast.error('Could not upload document')
    } finally {
      setUploadingDoc(false)
      e.target.value = ''
    }
  }

  return (
    <div className="span-2 nmw-handover-doc">
      <span className="block text-sm font-semibold text-zinc-800 mb-2">
        Handover document <span className="nmw-optional">(hospital form / PDF / photo)</span>
      </span>
      {form.handoverDocumentUrl ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <FileText size={18} className="text-emerald-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900 truncate">
              {form.handoverDocumentName || 'Uploaded document'}
            </p>
            <span className="flex items-center gap-3">
              <a
                href={uploadedFileUrl(form.handoverDocumentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 underline"
              >
                View file
              </a>
              <button
                type="button"
                className="text-xs font-bold text-emerald-700 underline"
                onClick={() =>
                  void downloadUploadedFile(
                    form.handoverDocumentUrl,
                    form.handoverDocumentName,
                  )
                }
              >
                Download
              </button>
            </span>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="text-xs font-bold text-red-600"
              onClick={() => setForm({ ...form, handoverDocumentUrl: '', handoverDocumentName: '' })}
            >
              Remove
            </button>
          )}
        </div>
      ) : readOnly ? (
        <p className="text-sm text-zinc-500">No document uploaded.</p>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 cursor-pointer hover:border-red-300 hover:bg-red-50/40 transition-colors">
          {uploadingDoc ? (
            <Loader2 className="animate-spin text-red-600" size={22} />
          ) : (
            <Upload className="text-zinc-500" size={22} />
          )}
          <span className="text-sm font-semibold text-zinc-700">
            {uploadingDoc ? 'Uploading…' : 'Upload handover document'}
          </span>
          <span className="text-xs text-zinc-500">PDF, JPG, or PNG — max 5 MB</span>
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
            disabled={uploadingDoc}
            onChange={handleHandoverDocUpload}
          />
        </label>
      )}
    </div>
  )
}

export function HandoverTaskFields({
  form,
  setForm,
  nurseName,
  caseContext,
  destinationAssigned = false,
  assignedDestination = '',
  readOnly = false,
  errors = {},
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  nurseName?: string
  caseContext?: HandoverCaseContext
  destinationAssigned?: boolean
  assignedDestination?: string
  readOnly?: boolean
  errors?: HandoverFieldErrors
}) {
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  const outcomeLabel = handoverOutcomeLabel(form.patientOutcome)
  const dispatcherDestination = assignedDestination.trim() || caseContext?.acceptedHospital?.trim() || ''
  const isDestinationAssigned = destinationAssigned || Boolean(dispatcherDestination)
  const displayedDestination = isDestinationAssigned
    ? dispatcherDestination
    : form.acceptedHospital || (readOnly ? '—' : '')
  const nationalityOptions =
    form.nationalityType && !COUNTRY_NAMES.includes(form.nationalityType as (typeof COUNTRY_NAMES)[number])
      ? [form.nationalityType, ...COUNTRY_NAMES]
      : COUNTRY_NAMES

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
          {isDestinationAssigned ? (
            <label className="span-2">
              Accepted hospital *
              <input value={displayedDestination || '—'} readOnly className="readonly" />
            </label>
          ) : readOnly ? (
            <label className="span-2">
              Destination hospital *
              <input value={displayedDestination} readOnly className="readonly" aria-invalid={Boolean(errors.acceptedHospital)} />
              <FieldError error={errors.acceptedHospital} />
            </label>
          ) : (
            <label className="span-2">
              Destination hospital *
              <input
                value={form.acceptedHospital}
                onChange={(e) => setForm({ ...form, acceptedHospital: e.target.value })}
                maxLength={200}
                placeholder="Hospital or facility where the patient was handed over"
                aria-invalid={Boolean(errors.acceptedHospital)}
              />
              <p className="nmw-field-hint">
                Dispatcher has not assigned a destination — enter where the patient was received.
              </p>
              <FieldError error={errors.acceptedHospital} />
            </label>
          )}
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
      <GenderField form={form} setForm={setForm} readOnly={readOnly} />
      <label>
        Nationality
        {readOnly ? (
          <input value={form.nationalityType || '—'} readOnly className="readonly" />
        ) : (
          <select
            value={form.nationalityType}
            onChange={(e) => setForm({ ...form, nationalityType: e.target.value })}
          >
            <option value="">Select country…</option>
            {nationalityOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        )}
      </label>
      <label>
        Marital status
        <input value={form.maritalStatus || '—'} readOnly className="readonly" />
      </label>
      <label>
        Driver
        <input value={form.driverName || '—'} readOnly className="readonly" />
      </label>
      <label>
        Handover nurse
        <input value={nurseName || form.nurseName || ''} readOnly className="readonly" />
      </label>

      <p className="nmw-form-section-label span-2">Handover details</p>
      <HandoverRejectedHospitalsSection
        entries={form.rejectedHospitals ?? []}
        onChange={(rejectedHospitals) => setForm({ ...form, rejectedHospitals })}
        readOnly={readOnly}
        error={errors.rejectedHospitals}
      />
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
        Patient condition summary <span className="nmw-optional">(optional)</span>
        <textarea
          rows={2}
          value={form.patientCondition}
          onChange={(e) => setForm({ ...form, patientCondition: e.target.value })}
          maxLength={2000}
          placeholder="Brief summary of patient condition at handover"
          aria-invalid={Boolean(errors.patientCondition)}
          {...ro}
        />
        <FieldError error={errors.patientCondition} />
      </label>
      <label className="span-2">
        Treatment given en route <span className="nmw-optional">(optional)</span>
        <textarea
          rows={2}
          value={form.treatmentGiven}
          onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })}
          maxLength={2000}
          placeholder="Treatments and interventions during transport"
          aria-invalid={Boolean(errors.treatmentGiven)}
          {...ro}
        />
        <FieldError error={errors.treatmentGiven} />
      </label>
      <label className="span-2">
        Receiving doctor (DR name) <span className="nmw-optional">(optional)</span>
        <input
          value={form.receivingStaff}
          onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })}
          maxLength={120}
          placeholder="Name of receiving doctor, if known"
          aria-invalid={Boolean(errors.receivingStaff)}
          {...ro}
        />
        <FieldError error={errors.receivingStaff} />
      </label>
      <label className="span-2">
        Handover notes <span className="nmw-optional">(optional)</span>
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
      <HandoverDocumentUpload form={form} setForm={setForm} readOnly={readOnly} />
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

export function MedicalNotesQuickFields({
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
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  return (
    <>
      <label className="span-2">
        Chief complaint *
        <input
          value={form.chiefComplaint}
          onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          maxLength={500}
          placeholder="Main reason for the call"
          aria-invalid={Boolean(errors.chiefComplaint)}
          {...ro}
        />
        <FieldError error={errors.chiefComplaint} />
      </label>
      <label>
        Consciousness
        {readOnly ? (
          <input value={form.consciousnessLevel} readOnly className="readonly" />
        ) : (
          <select
            value={form.consciousnessLevel}
            onChange={(e) => setForm({ ...form, consciousnessLevel: e.target.value })}
          >
            {CONSCIOUSNESS_LEVELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        Breathing
        {readOnly ? (
          <input value={form.breathingStatus} readOnly className="readonly" />
        ) : (
          <select
            value={form.breathingStatus}
            onChange={(e) => setForm({ ...form, breathingStatus: e.target.value })}
          >
            {BREATHING_STATUS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
      </label>
      <label>
        BP <span className="nmw-optional">(opt)</span>
        <input
          value={form.bloodPressure}
          onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
          placeholder="120/80"
          aria-invalid={Boolean(errors.bloodPressure)}
          {...ro}
        />
        <FieldError error={errors.bloodPressure} />
      </label>
      <label>
        Pulse <span className="nmw-optional">(opt)</span>
        <input
          value={form.heartRate}
          onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
          placeholder="bpm"
          aria-invalid={Boolean(errors.heartRate)}
          {...ro}
        />
        <FieldError error={errors.heartRate} />
      </label>
      <label>
        SpO₂ <span className="nmw-optional">(opt)</span>
        <input
          value={form.oxygenSaturation}
          onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })}
          placeholder="%"
          aria-invalid={Boolean(errors.oxygenSaturation)}
          {...ro}
        />
        <FieldError error={errors.oxygenSaturation} />
      </label>
      <label className="span-2">
        Treatment given <span className="nmw-optional">(optional)</span>
        <input
          value={form.treatmentType === 'Other' ? form.treatmentOtherDetails : form.treatmentType}
          onChange={(e) => setForm({ ...form, treatmentType: e.target.value, treatmentOtherDetails: '' })}
          maxLength={500}
          placeholder="Oxygen, IV, medication…"
          {...ro}
        />
      </label>
      <label className="span-2">
        Notes <span className="nmw-optional">(optional)</span>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          maxLength={2000}
          placeholder="Anything else for dispatch or hospital"
          aria-invalid={Boolean(errors.notes)}
          {...ro}
        />
        <FieldError error={errors.notes} />
      </label>
    </>
  )
}

export function HandoverQuickFields({
  form,
  setForm,
  nurseName,
  assignedDestination = '',
  readOnly = false,
  errors = {},
}: {
  form: HandoverFormState
  setForm: (f: HandoverFormState) => void
  nurseName?: string
  assignedDestination?: string
  readOnly?: boolean
  errors?: HandoverFieldErrors
}) {
  const ro = readOnly ? { readOnly: true, className: 'readonly' as const } : {}
  const outcomeLabel = handoverOutcomeLabel(form.patientOutcome)
  const destination = assignedDestination.trim() || form.acceptedHospital

  return (
    <>
      {destination && (
        <label className="span-2">
          Hospital
          <input value={destination} readOnly className="readonly" />
        </label>
      )}
      {!assignedDestination.trim() && !readOnly && (
        <label className="span-2">
          Hospital *
          <input
            value={form.acceptedHospital}
            onChange={(e) => setForm({ ...form, acceptedHospital: e.target.value })}
            maxLength={200}
            placeholder="Receiving hospital"
            aria-invalid={Boolean(errors.acceptedHospital)}
          />
          <FieldError error={errors.acceptedHospital} />
        </label>
      )}

      <HandoverRejectedHospitalsSection
        entries={form.rejectedHospitals ?? []}
        onChange={(rejectedHospitals) => setForm({ ...form, rejectedHospitals })}
        readOnly={readOnly}
        error={errors.rejectedHospitals}
      />

      <p className="nmw-form-section-label span-2">Patient details</p>
      <GenderField form={form} setForm={setForm} readOnly={readOnly} />

      <label className="span-2">
        Patient status *
        {readOnly ? (
          <input value={outcomeLabel || '—'} readOnly className="readonly" />
        ) : (
          <select
            value={form.patientOutcome}
            onChange={(e) => setForm({ ...form, patientOutcome: e.target.value })}
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
        Condition summary <span className="nmw-optional">(optional)</span>
        <textarea
          rows={2}
          value={form.patientCondition}
          onChange={(e) => setForm({ ...form, patientCondition: e.target.value })}
          maxLength={2000}
          placeholder="Brief status at handover"
          aria-invalid={Boolean(errors.patientCondition)}
          {...ro}
        />
        <FieldError error={errors.patientCondition} />
      </label>
      <label className="span-2">
        Treatment en route <span className="nmw-optional">(optional)</span>
        <textarea
          rows={2}
          value={form.treatmentGiven}
          onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })}
          maxLength={2000}
          placeholder="Oxygen, IV, medication…"
          aria-invalid={Boolean(errors.treatmentGiven)}
          {...ro}
        />
        <FieldError error={errors.treatmentGiven} />
      </label>
      <label className="span-2">
        Receiving doctor <span className="nmw-optional">(optional)</span>
        <input
          value={form.receivingStaff}
          onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })}
          maxLength={120}
          placeholder="Name if known"
          aria-invalid={Boolean(errors.receivingStaff)}
          {...ro}
        />
        <FieldError error={errors.receivingStaff} />
      </label>
      <HandoverDocumentUpload form={form} setForm={setForm} readOnly={readOnly} />
      <label className="span-2">
        Your signature (full name) *
        <input
          value={form.signature}
          onChange={(e) => setForm({ ...form, signature: e.target.value })}
          maxLength={120}
          placeholder={nurseName || 'Full name'}
          aria-invalid={Boolean(errors.signature)}
          {...ro}
        />
        <FieldError error={errors.signature} />
      </label>
    </>
  )
}

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
