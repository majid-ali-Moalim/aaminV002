'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  HeartHandshake,
  MapPin,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  Activity,
  Loader2,
} from 'lucide-react'
import { emergencyRequestsService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'

const CLOSED = ['COMPLETED', 'CANCELLED']

type Props = {
  /** assigned = nurse assigned but not yet active care; active = in-progress */
  mode: 'active' | 'assigned'
}

export default function NurseMissionCasesView({ mode }: Props) {
  const { nurseId } = useNurseEmployee()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async (showLoader = false) => {
    if (!nurseId) return
    try {
      if (showLoader) setLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(false), 15000)
    return () => clearInterval(t)
  }, [nurseId])

  const filtered = useMemo(() => {
    let list = requests.filter((r) => r.nurseId === nurseId)
    if (mode === 'active') {
      list = list.filter((r) => !CLOSED.includes(r.status))
    } else {
      list = list.filter((r) => r.status === 'ASSIGNED' || (r.status === 'DISPATCHED' && !CLOSED.includes(r.status)))
    }
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(
      (r) =>
        r.trackingCode?.toLowerCase().includes(q) ||
        r.patient?.fullName?.toLowerCase().includes(q) ||
        r.pickupLocation?.toLowerCase().includes(q),
    )
  }, [requests, nurseId, mode, search])

  if (!nurseId) {
    return <p className="nurse-empty">Link your account to a nurse employee profile to view missions.</p>
  }

  return (
    <div className="space-y-4">
      <div className="nurse-toolbar">
        <div className="nurse-search">
          <Search size={16} />
          <input
            placeholder="Search case ID, patient, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="nurse-btn ghost" onClick={() => load(true)}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && filtered.length === 0 ? (
        <div className="nurse-loading">
          <Loader2 className="animate-spin" size={28} />
          <span>Loading cases…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nurse-empty-card">
          <HeartHandshake size={32} className="text-red-400 mb-3" />
          <p>No {mode === 'active' ? 'active' : 'assigned'} patient cases.</p>
        </div>
      ) : (
        <div className="nurse-card-stack">
          {filtered.map((r) => (
            <article key={r.id} className="nurse-case-card">
              <div className="nurse-case-top">
                <span className="nurse-case-code">{r.trackingCode}</span>
                <span className={`nurse-priority ${r.priority?.toLowerCase()}`}>{r.priority}</span>
                <span className="nurse-status-chip">{r.status?.replace(/_/g, ' ')}</span>
              </div>
              <div className="nurse-case-row">
                <User size={14} />
                <span>{r.patient?.fullName || r.callerName || 'Unknown patient'}</span>
              </div>
              <div className="nurse-case-row">
                <MapPin size={14} />
                <span>{r.pickupLocation}</span>
              </div>
              <PickupGpsPanel request={r} variant="compact" tone="dark" />
              {r.patientCondition && (
                <div className="nurse-case-row">
                  <Stethoscope size={14} />
                  <span>{r.patientCondition}</span>
                </div>
              )}
              <div className="nurse-case-row muted">
                <Activity size={14} />
                <span>
                  Updated {format(new Date(r.updatedAt || r.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
