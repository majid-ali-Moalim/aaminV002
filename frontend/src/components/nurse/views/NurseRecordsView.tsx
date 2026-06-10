'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Activity,
  Droplets,
  FileText,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Thermometer,
} from 'lucide-react'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'

type Props = {
  variant: 'assessments' | 'treatment' | 'vitals' | 'notes' | 'history'
}

export default function NurseRecordsView({ variant }: Props) {
  const { nurseId } = useNurseEmployee()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    if (!nurseId) return
    try {
      setLoading(true)
      const data = await nursesService.getPatientCareRecords(nurseId)
      setRecords(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [nurseId])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return records.filter((r) => {
      const code = r.emergencyRequest?.trackingCode?.toLowerCase() || ''
      const notes = (r.clinicalNotes || r.notes || '').toLowerCase()
      const match =
        !q || code.includes(q) || notes.includes(q) || r.patient?.fullName?.toLowerCase().includes(q)
      if (!match) return false
      if (variant === 'vitals') return r.bloodPressure || r.heartRate || r.temperature || r.oxygenSaturation
      if (variant === 'notes') return Boolean(r.clinicalNotes || r.notes)
      if (variant === 'assessments') return Boolean(r.assessment || r.clinicalNotes)
      return true
    })
  }, [records, search, variant])

  const title =
    variant === 'vitals'
      ? 'Vital Signs'
      : variant === 'notes'
        ? 'Clinical Notes'
        : variant === 'history'
          ? 'Patient History'
          : variant === 'assessments'
            ? 'Patient Assessments'
            : 'Treatment Records'

  return (
    <div className="space-y-4">
      <div className="nurse-toolbar">
        <div className="nurse-search">
          <Search size={16} />
          <input placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className="nurse-btn ghost" onClick={load}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        {(variant === 'assessments' || variant === 'treatment' || variant === 'notes') && (
          <button type="button" className="nurse-btn primary">
            <Plus size={16} />
            New Entry
          </button>
        )}
      </div>

      {loading ? (
        <div className="nurse-loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="nurse-empty-card">
          <FileText size={32} className="text-red-400 mb-3" />
          <p>No {title.toLowerCase()} found for your cases.</p>
        </div>
      ) : (
        <div className="nurse-card-stack">
          {filtered.map((r) => (
            <article key={r.id} className="nurse-record-card">
              <div className="nurse-case-top">
                <span className="nurse-case-code">{r.emergencyRequest?.trackingCode || 'CASE'}</span>
                <span className="nurse-case-date">
                  {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                </span>
              </div>
              {(variant === 'vitals' || variant === 'history' || variant === 'treatment') && (
                <div className="nurse-vitals-grid">
                  {r.bloodPressure && (
                    <span><Heart size={12} /> BP {r.bloodPressure}</span>
                  )}
                  {r.heartRate && (
                    <span><Activity size={12} /> HR {r.heartRate}</span>
                  )}
                  {r.temperature && (
                    <span><Thermometer size={12} /> Temp {r.temperature}</span>
                  )}
                  {r.oxygenSaturation && (
                    <span><Droplets size={12} /> SpO₂ {r.oxygenSaturation}</span>
                  )}
                </div>
              )}
              {(r.clinicalNotes || r.notes || r.assessment) && (
                <p className="nurse-record-notes">{r.clinicalNotes || r.notes || r.assessment}</p>
              )}
              {r.patient?.fullName && (
                <p className="nurse-record-patient">Patient: {r.patient.fullName}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
