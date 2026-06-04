'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { DriverPanel } from '@/components/driver/DriverModuleShell'
import { useDriverStore } from '@/lib/stores/driverStore'

const INCIDENT_TYPES = [
  'Traffic Delay',
  'Road Closure',
  'Vehicle Breakdown',
  'Communication Failure',
  'Patient Transport Issue',
  'Safety Concern',
  'Other',
]

export default function IncidentsNewView() {
  const { activeMission } = useDriverStore()
  const [form, setForm] = useState({
    title: '',
    type: INCIDENT_TYPES[0],
    description: '',
    priority: 'MEDIUM',
  })
  const [saving, setSaving] = useState(false)

  const submit = async (draft = false) => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    toast.success(draft ? 'Draft saved' : 'Incident report submitted to dispatch')
    if (!draft) {
      setForm({ title: '', type: INCIDENT_TYPES[0], description: '', priority: 'MEDIUM' })
    }
  }

  return (
    <div className="driver-form-stack">
      <DriverPanel title="New Incident Report">
        <div className="driver-form-field">
          <label>Incident Title</label>
          <input
            className="driver-input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Brief summary"
          />
        </div>
        <div className="driver-form-field">
          <label>Incident Type</label>
          <select
            className="driver-input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="driver-form-field">
          <label>Priority Level</label>
          <select
            className="driver-input"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          >
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="driver-form-field">
          <label>Mission Reference</label>
          <input
            className="driver-input"
            readOnly
            value={activeMission?.trackingCode || 'No active mission'}
          />
        </div>
        <div className="driver-form-field">
          <label>Description</label>
          <textarea
            className="driver-input driver-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Describe what happened..."
          />
        </div>
        <div className="driver-form-actions">
          <button type="button" className="driver-btn-sm ghost" disabled={saving} onClick={() => submit(true)}>Save Draft</button>
          <button type="button" className="driver-btn-sm primary" disabled={saving} onClick={() => submit(false)}>Submit Report</button>
        </div>
      </DriverPanel>
    </div>
  )
}
