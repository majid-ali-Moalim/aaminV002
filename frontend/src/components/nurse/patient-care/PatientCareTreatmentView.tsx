'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Activity, Loader2, Plus } from 'lucide-react'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import { TREATMENT_TYPES, isAssessmentRecord } from '@/lib/nurse/patientCareTypes'

type Props = { caseId?: string | null }

export default function PatientCareTreatmentView({ caseId }: Props) {
  const { nurseId, fullName } = useNurseEmployee()
  const { cases, primaryCase } = useNurseCases()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ treatmentType: TREATMENT_TYPES[0], notes: '', medication: '' })

  const mission = caseId ? cases.find((c) => c.id === caseId) || primaryCase : primaryCase

  const load = async () => {
    if (!nurseId) return
    try {
      const data = await nursesService.getPatientCareRecords(nurseId)
      setRecords(
        (Array.isArray(data) ? data : []).filter(
          (r) => r.treatmentGiven && !isAssessmentRecord(r),
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [nurseId])

  const caseRecords = useMemo(
    () =>
      mission
        ? records.filter((r) => r.requestId === mission.id || r.emergencyRequest?.id === mission.id)
        : records,
    [records, mission],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nurseId || !mission) {
      toast.error('Select an active case first')
      return
    }
    setSaving(true)
    try {
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        treatmentGiven: form.treatmentType,
        clinicalNotes: form.notes,
        medications: form.medication || undefined,
      })
      toast.success('Treatment recorded')
      setForm({ treatmentType: TREATMENT_TYPES[0], notes: '', medication: '' })
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save treatment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="npc-split">
      <form onSubmit={submit} className="nurse-form-card npc-form">
        <div className="npc-form-head">
          <Activity size={20} className="text-red-500" />
          <div>
            <h3>Record Treatment</h3>
            <p className="text-sm text-zinc-500">
              {mission ? `${mission.trackingCode} · Performed by ${fullName || 'Nurse'}` : 'No active case'}
            </p>
          </div>
        </div>

        <div className="nurse-form-grid">
          <label className="span-2">
            Treatment type *
            <select
              value={form.treatmentType}
              onChange={(e) => setForm({ ...form, treatmentType: e.target.value })}
            >
              {TREATMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Medication / details (if applicable)
            <input
              value={form.medication}
              onChange={(e) => setForm({ ...form, medication: e.target.value })}
              placeholder="Drug name, dose, route"
            />
          </label>
          <label className="span-2">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Procedure details, patient response"
            />
          </label>
        </div>

        <button type="submit" className="nurse-btn primary w-full" disabled={saving || !mission}>
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Add Treatment
        </button>
      </form>

      <aside className="npc-history">
        <h3>Treatment history</h3>
        {loading ? (
          <div className="nurse-loading"><Loader2 className="animate-spin" size={24} /></div>
        ) : caseRecords.length === 0 ? (
          <p className="nurse-empty-inline">No treatments recorded yet.</p>
        ) : (
          <ul className="npc-history-list">
            {caseRecords.map((r) => (
              <li key={r.id} className="npc-history-item">
                <p className="font-bold text-white">{r.treatmentGiven}</p>
                <p className="text-sm text-zinc-400">{r.emergencyRequest?.trackingCode}</p>
                {r.medications && <p className="text-xs text-zinc-500">Med: {r.medications}</p>}
                {r.clinicalNotes && <p className="text-sm text-zinc-400 mt-1">{r.clinicalNotes}</p>}
                <p className="text-xs text-zinc-600 mt-2">
                  {format(new Date(r.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
