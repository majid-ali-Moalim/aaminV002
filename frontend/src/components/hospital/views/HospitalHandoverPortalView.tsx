'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Loader2, RefreshCw } from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

export default function HospitalHandoverView() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ receivingStaff: '', department: '', notes: '' })

  const load = () => {
    setLoading(true)
    hospitalAppApi.getHandoverQueue().then((d) => setQueue(Array.isArray(d) ? d : d?.items ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const complete = async (caseId: string) => {
    if (!form.receivingStaff.trim()) {
      toast.error('Receiving staff is required')
      return
    }
    try {
      await hospitalAppApi.startHandover(caseId)
      await hospitalAppApi.completeHandover(caseId, {
        receivingStaffName: form.receivingStaff,
        department: form.department,
        notes: form.notes,
      })
      toast.success('Handover completed')
      setForm({ receivingStaff: '', department: '', notes: '' })
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Handover failed')
    }
  }

  return (
    <div className="hosp-stack">
      <div className="hosp-toolbar">
        <p className="text-sm text-slate-500">Patients awaiting clinical handover</p>
        <button type="button" className="hosp-icon-btn" onClick={load}><RefreshCw size={16} /></button>
      </div>

      {loading ? (
        <div className="hosp-loading"><Loader2 className="animate-spin" size={24} /></div>
      ) : queue.length === 0 ? (
        <div className="hosp-empty"><ClipboardList size={32} /> No patients in handover queue.</div>
      ) : (
        <div className="hosp-card-list">
          {queue.map((c) => {
            const req = c.emergencyRequest ?? {}
            return (
              <article key={c.id} className="hosp-case-card">
                <div className="hosp-case-top">
                  <span className="mono">{c.caseNumber}</span>
                  <span className="hosp-status">{c.status?.replace(/_/g, ' ')}</span>
                </div>
                <p>Patient: {req.patient?.fullName || req.callerName || '—'}</p>
                <div className="hosp-form-grid">
                  <label>Receiving staff<input value={form.receivingStaff} onChange={(e) => setForm({ ...form, receivingStaff: e.target.value })} /></label>
                  <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
                  <label className="span-2">Notes<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                </div>
                <button type="button" className="hosp-btn primary" onClick={() => complete(c.id)}>Complete Handover</button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
