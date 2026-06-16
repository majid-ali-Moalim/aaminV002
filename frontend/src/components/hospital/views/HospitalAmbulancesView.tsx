'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, MapPin, RefreshCw, Truck } from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

export default function HospitalAmbulancesView() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    hospitalAppApi.getIncomingAmbulances().then((d) => setRows(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="hosp-stack">
      <div className="hosp-toolbar">
        <p className="text-sm text-slate-500">Ambulances currently heading to your facility</p>
        <button type="button" className="hosp-icon-btn" onClick={load}><RefreshCw size={16} /></button>
      </div>
      {loading ? (
        <div className="hosp-loading"><Loader2 className="animate-spin" size={24} /></div>
      ) : rows.length === 0 ? (
        <div className="hosp-empty">No incoming ambulances.</div>
      ) : (
        <div className="hosp-card-list">
          {rows.map((r) => {
            const status = r.status === 'ARRIVED_HOSPITAL' ? 'Arrived' : r.status === 'TRANSPORTING' ? 'En Route' : 'En Route'
            const driver = r.driver ? `${r.driver.firstName || ''} ${r.driver.lastName || ''}`.trim() : '—'
            const nurse = r.nurse ? `${r.nurse.firstName || ''} ${r.nurse.lastName || ''}`.trim() : '—'
            return (
              <article key={r.id} className="hosp-case-card">
                <div className="hosp-case-top">
                  <span className="mono">{r.trackingCode}</span>
                  <span className={`hosp-priority ${r.priority?.toLowerCase()}`}>{r.priority}</span>
                  <span className="hosp-status">{status}</span>
                </div>
                <p><Truck size={14} /> Ambulance {r.ambulance?.ambulanceNumber || '—'} · Driver {driver} · Nurse {nurse}</p>
                <p><MapPin size={14} /> Patient: {r.patient?.fullName || r.callerName || '—'}</p>
                <p className="text-xs text-slate-500">Updated {format(new Date(r.updatedAt || r.createdAt), 'MMM d, h:mm a')}</p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
