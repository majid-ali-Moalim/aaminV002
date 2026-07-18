'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Loader2, Plus, Trash2, XCircle, History } from 'lucide-react'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import {
  buildCaseClosureDefaults,
  buildPatientStatusSummary,
  caseClosureReadonlyFields,
  HOSPITAL_REFUSAL_REASON_OPTIONS,
  newRejectedHospitalEntry,
  serializeRejectedHospitals,
  type CaseClosureFormState,
  type RejectedHospitalEntry,
} from '@/lib/emergency/buildCaseClosureDefaults'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
} from '@/lib/emergency/triageOptions'

type Props = {
  request: EmergencyRequest
  onClose: () => void
  onSuccess: () => void
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 active-missions-field'

const selectClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 active-missions-field appearance-none'

const readonlyClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 active-missions-field readonly'

const labelClass = 'text-[10px] font-bold text-slate-600 uppercase tracking-wider active-missions-label'

function StatusSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StructuredStatusHistory({ request }: { request: EmergencyRequest }) {
  const logs = [...(request.statusLogs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  if (logs.length === 0) {
    return <p className="text-sm text-slate-500 active-missions-muted">No status changes recorded yet.</p>
  }

  return (
    <div className="active-missions-status-table overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Time</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">From</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">To</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">By</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const actor = log.changedByEmployee
              ? `${log.changedByEmployee.firstName || ''} ${log.changedByEmployee.lastName || ''}`.trim()
              : 'System'
            return (
              <tr key={log.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                  {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">
                  {(log.fromStatus || '—').replace(/_/g, ' ')}
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-red-600">
                  {log.toStatus.replace(/_/g, ' ')}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{actor}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[200px]">
                  <span className="line-clamp-2">{log.notes || '—'}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RejectedHospitalsSection({
  entries,
  onChange,
}: {
  entries: RejectedHospitalEntry[]
  onChange: (entries: RejectedHospitalEntry[]) => void
}) {
  const addEntry = () => onChange([...entries, newRejectedHospitalEntry()])

  const updateEntry = (id: string, patch: Partial<RejectedHospitalEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className={labelClass}>Rejected hospitals</span>
        <button
          type="button"
          onClick={addEntry}
          className="active-missions-icon-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
        >
          <Plus className="w-3.5 h-3.5" />
          Add rejected hospital
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 active-missions-muted rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center">
          No rejected hospitals recorded. Click the plus button to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 active-missions-rejected-card"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700">Rejected hospital #{index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="active-missions-icon-btn p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  aria-label="Remove rejected hospital"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <label className="block space-y-1.5">
                <span className={labelClass}>Hospital name</span>
                <input
                  value={entry.hospitalName}
                  onChange={(e) => updateEntry(entry.id, { hospitalName: e.target.value })}
                  className={inputClass}
                  placeholder="Hospital that refused the patient"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Refusal reason</span>
                  <select
                    value={entry.reason}
                    onChange={(e) => updateEntry(entry.id, { reason: e.target.value })}
                    className={selectClass}
                  >
                    {HOSPITAL_REFUSAL_REASON_OPTIONS.map((opt) => (
                      <option key={opt.value || 'empty'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className={labelClass}>Notes</span>
                  <input
                    value={entry.notes}
                    onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                    className={inputClass}
                    placeholder="Optional details"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompleteCaseModal({ request, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fullCase, setFullCase] = useState<EmergencyRequest | null>(null)
  const [form, setForm] = useState<CaseClosureFormState>(buildCaseClosureDefaults(request))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await emergencyRequestsService.getById(request.id)
        if (!cancelled) {
          setFullCase(data)
          setForm(buildCaseClosureDefaults(data))
        }
      } catch {
        if (!cancelled) setFullCase(request)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [request])

  const caseData = fullCase || request
  const readonly = caseClosureReadonlyFields(caseData)

  const handleSubmit = async () => {
    if (!form.dispatcherNotes.trim()) {
      alert('Please add dispatcher completion notes before closing the case.')
      return
    }
    try {
      setSubmitting(true)
      await emergencyRequestsService.completeRequest(caseData.id, {
        acceptedHospital: form.acceptedHospital,
        rejectedHospitals: serializeRejectedHospitals(form.rejectedEntries),
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientConditionAtClose: buildPatientStatusSummary(form),
        receivingStaff: form.receivingStaff,
        treatmentSummary: form.treatmentSummary,
        handoverNotes: form.handoverNotes,
        dispatcherNotes: form.dispatcherNotes,
      })
      onSuccess()
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Completion failed'
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-end sm:items-center z-[130] p-0 sm:p-4">
      <div className="active-missions-modal bg-white w-full max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="bg-emerald-600 p-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Complete Mission — {readonly.trackingCode}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold">Loading crew and clinical records…</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 active-missions-muted">
                Review field crew data, patient status, and hospital outcome before closing the case.
              </p>

              <section className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <History className="w-4 h-4 text-red-500" />
                  Status history
                </h4>
                <StructuredStatusHistory request={caseData} />
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={labelClass}>Driver</p>
                  <input readOnly value={readonly.driverName} className={readonlyClass} />
                </div>
                <div>
                  <p className={labelClass}>Nurse</p>
                  <input readOnly value={readonly.nurseName} className={readonlyClass} />
                </div>
                <div>
                  <p className={labelClass}>Ambulance unit</p>
                  <input readOnly value={readonly.ambulance} className={readonlyClass} />
                </div>
                <div>
                  <p className={labelClass}>Patient</p>
                  <input readOnly value={readonly.patientName} className={readonlyClass} />
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 p-4 space-y-4 bg-white">
                <div>
                  <h4 className="text-sm font-black text-slate-900">Patient status check</h4>
                  <p className="text-xs text-slate-500 mt-1 active-missions-muted">
                    Confirm final patient status at case closure using the lists below.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatusSelect
                    label="Conscious"
                    value={form.consciousStatus}
                    options={CONSCIOUS_STATUS_OPTIONS}
                    onChange={(consciousStatus) => setForm({ ...form, consciousStatus })}
                  />
                  <StatusSelect
                    label="Breathing"
                    value={form.breathingStatus}
                    options={BREATHING_STATUS_OPTIONS}
                    onChange={(breathingStatus) => setForm({ ...form, breathingStatus })}
                  />
                  <StatusSelect
                    label="Bleeding"
                    value={form.bleedingStatus}
                    options={BLEEDING_STATUS_OPTIONS}
                    onChange={(bleedingStatus) => setForm({ ...form, bleedingStatus })}
                  />
                </div>
                <label className="block space-y-1.5">
                  <span className={labelClass}>Condition summary at close</span>
                  <textarea
                    rows={2}
                    value={form.patientConditionAtClose}
                    onChange={(e) => setForm({ ...form, patientConditionAtClose: e.target.value })}
                    className={inputClass}
                    placeholder="Clinical summary confirmed at completion"
                  />
                </label>
              </section>

              <div className="grid grid-cols-1 gap-4">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Accepted hospital</span>
                  <input
                    value={form.acceptedHospital}
                    onChange={(e) => setForm({ ...form, acceptedHospital: e.target.value })}
                    className={inputClass}
                    placeholder="Hospital that received the patient"
                  />
                </label>

                <RejectedHospitalsSection
                  entries={form.rejectedEntries}
                  onChange={(rejectedEntries) => setForm({ ...form, rejectedEntries })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className={labelClass}>Receiving staff</span>
                    <input
                      value={form.receivingStaff}
                      onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })}
                      className={inputClass}
                      placeholder="Doctor / nurse at hospital"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className={labelClass}>Treatment summary</span>
                    <input
                      value={form.treatmentSummary}
                      onChange={(e) => setForm({ ...form, treatmentSummary: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className={labelClass}>Handover notes (from nurse)</span>
                  <textarea
                    rows={3}
                    value={form.handoverNotes}
                    onChange={(e) => setForm({ ...form, handoverNotes: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={labelClass}>Dispatcher completion notes *</span>
                  <textarea
                    rows={3}
                    value={form.dispatcherNotes}
                    onChange={(e) => setForm({ ...form, dispatcherNotes: e.target.value })}
                    className={inputClass}
                    placeholder="Final closure notes for audit trail"
                    required
                  />
                </label>
              </div>
            </>
          )}
        </div>

        <div className="active-missions-modal-footer bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="active-missions-btn-secondary flex-1 rounded-xl font-bold h-11"
          >
            Keep Active
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !form.dispatcherNotes.trim()}
            className="active-missions-btn-primary flex-1 rounded-xl font-bold h-11 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Completing…
              </>
            ) : (
              'Confirm Completion'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
