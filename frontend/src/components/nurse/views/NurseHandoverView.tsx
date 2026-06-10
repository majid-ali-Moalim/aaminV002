'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, PenLine, User } from 'lucide-react'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'

export default function NurseHandoverView() {
  const { fullName } = useNurseEmployee()
  const [form, setForm] = useState({
    caseId: '',
    patientName: '',
    condition: '',
    treatmentGiven: '',
    receivingStaff: '',
    notes: '',
    signature: '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.caseId || !form.signature) {
      toast.error('Case ID and signature are required')
      return
    }
    toast.success('Handover submitted to receiving facility')
    setForm({
      caseId: '',
      patientName: '',
      condition: '',
      treatmentGiven: '',
      receivingStaff: '',
      notes: '',
      signature: '',
    })
  }

  return (
    <form onSubmit={submit} className="nurse-form-card">
      <div className="nurse-form-header">
        <ClipboardList size={22} className="text-red-500" />
        <div>
          <h2 className="font-bold text-white">Patient Handover Form</h2>
          <p className="text-sm text-zinc-400">Complete clinical handover at hospital arrival</p>
        </div>
      </div>

      <div className="nurse-form-grid">
        <label>
          Case ID
          <input value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} placeholder="CASE-2026-0001" required />
        </label>
        <label>
          Patient name
          <input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
        </label>
        <label className="span-2">
          Patient condition summary
          <textarea rows={3} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
        </label>
        <label className="span-2">
          Treatment given en route
          <textarea rows={3} value={form.treatmentGiven} onChange={(e) => setForm({ ...form, treatmentGiven: e.target.value })} />
        </label>
        <label>
          Receiving staff
          <input value={form.receivingStaff} onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })} />
        </label>
        <label>
          Handover nurse
          <input value={fullName || ''} readOnly className="readonly" />
        </label>
        <label className="span-2">
          Additional notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label className="span-2">
          <PenLine size={14} className="inline mr-1" />
          Digital signature (type full name)
          <input value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} required />
        </label>
      </div>

      <button type="submit" className="nurse-btn primary w-full">
        Submit Handover
      </button>
    </form>
  )
}
