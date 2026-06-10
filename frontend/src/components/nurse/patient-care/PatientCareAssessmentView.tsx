'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Loader2, Save, Stethoscope } from 'lucide-react'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  BREATHING_STATUS,
  CONSCIOUSNESS_LEVELS,
  PAIN_LEVELS,
  encodeAssessment,
  isAssessmentRecord,
  parseClinicalRecord,
} from '@/lib/nurse/patientCareTypes'

type Props = { caseId?: string | null }

const emptyForm = {
  chiefComplaint: '',
  symptoms: '',
  consciousnessLevel: 'Alert',
  painLevel: '0',
  breathingStatus: 'Normal',
  injuryDescription: '',
  assessmentNotes: '',
}

export default function PatientCareAssessmentView({ caseId }: Props) {
  const { nurseId } = useNurseEmployee()
  const { cases, primaryCase, loading: casesLoading } = useNurseCases()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const mission = caseId ? cases.find((c) => c.id === caseId) || primaryCase : primaryCase

  const loadRecords = async () => {
    if (!nurseId) return
    try {
      const data = await nursesService.getPatientCareRecords(nurseId)
      setRecords((Array.isArray(data) ? data : []).filter(isAssessmentRecord))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [nurseId])

  const caseRecords = useMemo(
    () => (mission ? records.filter((r) => r.requestId === mission.id || r.emergencyRequest?.id === mission.id) : records),
    [records, mission],
  )

  const startEdit = (record: any) => {
    const data = parseClinicalRecord(record.clinicalNotes)
    if (!data) return
    setEditId(record.id)
    setForm({
      chiefComplaint: data.chiefComplaint,
      symptoms: data.symptoms,
      consciousnessLevel: data.consciousnessLevel,
      painLevel: data.painLevel,
      breathingStatus: data.breathingStatus,
      injuryDescription: data.injuryDescription,
      assessmentNotes: data.assessmentNotes,
    })
  }

  const resetForm = () => {
    setEditId(null)
    setForm(emptyForm)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nurseId || !mission) {
      toast.error('Select an active case first')
      return
    }
    if (!form.chiefComplaint.trim()) {
      toast.error('Chief complaint is required')
      return
    }
    setSaving(true)
    try {
      await nursesService.createPatientCareRecord({
        emergencyRequestId: mission.id,
        nurseId,
        patientId: mission.patientId || mission.patient?.id,
        clinicalNotes: encodeAssessment(form),
      })
      toast.success(editId ? 'Assessment updated (new entry saved)' : 'Assessment saved')
      resetForm()
      await loadRecords()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save assessment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="npc-split">
      <form onSubmit={submit} className="nurse-form-card npc-form">
        <div className="npc-form-head">
          <Stethoscope size={20} className="text-red-500" />
          <div>
            <h3>Patient Assessment</h3>
            <p className="text-sm text-zinc-500">
              {mission ? `${mission.trackingCode} · ${mission.patient?.fullName || 'Patient'}` : 'No active case selected'}
            </p>
          </div>
        </div>

        <div className="nurse-form-grid">
          <label className="span-2">
            Chief complaint *
            <input
              value={form.chiefComplaint}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
              placeholder="Primary reason for emergency call"
              required
            />
          </label>
          <label className="span-2">
            Symptoms
            <textarea
              rows={2}
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              placeholder="Reported or observed symptoms"
            />
          </label>
          <label>
            Consciousness level
            <select
              value={form.consciousnessLevel}
              onChange={(e) => setForm({ ...form, consciousnessLevel: e.target.value })}
            >
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
            <select
              value={form.breathingStatus}
              onChange={(e) => setForm({ ...form, breathingStatus: e.target.value })}
            >
              {BREATHING_STATUS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Injury description
            <input
              value={form.injuryDescription}
              onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })}
              placeholder="Visible injuries, mechanism"
            />
          </label>
          <label className="span-2">
            Assessment notes
            <textarea
              rows={3}
              value={form.assessmentNotes}
              onChange={(e) => setForm({ ...form, assessmentNotes: e.target.value })}
              placeholder="Clinical observations and plan"
            />
          </label>
        </div>

        <div className="npc-form-actions">
          {editId && (
            <button type="button" className="nurse-btn ghost" onClick={resetForm}>
              Cancel edit
            </button>
          )}
          <button type="submit" className="nurse-btn primary" disabled={saving || !mission}>
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {editId ? 'Update Assessment' : 'Save Assessment'}
          </button>
        </div>
      </form>

      <aside className="npc-history">
        <h3>Saved assessments</h3>
        {loading || casesLoading ? (
          <div className="nurse-loading"><Loader2 className="animate-spin" size={24} /></div>
        ) : caseRecords.length === 0 ? (
          <p className="nurse-empty-inline">No assessments recorded yet.</p>
        ) : (
          <ul className="npc-history-list">
            {caseRecords.map((r) => {
              const a = parseClinicalRecord(r.clinicalNotes)
              if (!a) return null
              return (
                <li key={r.id} className="npc-history-item">
                  <p className="font-bold text-red-400">{r.emergencyRequest?.trackingCode}</p>
                  <p className="text-sm text-zinc-300">{a.chiefComplaint}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    AVPU {a.consciousnessLevel} · Pain {a.painLevel}/10 · {a.breathingStatus}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {format(new Date(r.createdAt), 'MMM d, h:mm a')}
                  </p>
                  <button type="button" className="npc-edit-link" onClick={() => startEdit(r)}>
                    Edit / copy to form
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}
