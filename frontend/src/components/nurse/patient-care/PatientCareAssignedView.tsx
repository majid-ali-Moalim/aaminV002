'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Eye, Loader2, Phone, RefreshCw, Search, Truck, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import {
  filterCasesByStatus,
  MISSION_STATUS_FILTERS,
  type MissionFilterId,
} from '@/lib/nurse/patientCareTypes'

export default function PatientCareAssignedView() {
  const router = useRouter()
  const { cases, loading, reload } = useNurseCases()
  const [filter, setFilter] = useState<MissionFilterId>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = filterCasesByStatus(cases, filter)
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.trackingCode?.toLowerCase().includes(q) ||
          r.patient?.fullName?.toLowerCase().includes(q) ||
          r.driver?.firstName?.toLowerCase().includes(q),
      )
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
    )
  }, [cases, filter, search])

  return (
    <div className="space-y-4">
      <div className="nurse-toolbar">
        <div className="nurse-search">
          <Search size={16} />
          <input
            placeholder="Search case, patient, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="nurse-btn ghost" onClick={() => reload(true)}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="npc-filter-row">
        {MISSION_STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`npc-filter-chip${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <div className="nurse-loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="nurse-empty-card">No missions match this filter.</div>
      ) : (
        <div className="npc-assigned-list">
          {filtered.map((m) => {
            const driverName = m.driver
              ? `${m.driver.firstName || ''} ${m.driver.lastName || ''}`.trim()
              : '—'
            return (
              <article key={m.id} className="npc-assigned-card">
                <div className="npc-assigned-top">
                  <span className="nurse-case-code">{m.trackingCode}</span>
                  <span className={`nurse-priority ${m.priority?.toLowerCase()}`}>{m.priority}</span>
                  <span className="nurse-status-chip">{m.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="npc-assigned-grid">
                  <Cell label="Patient" value={m.patient?.fullName || '—'} icon={<User size={13} />} />
                  <Cell label="Driver" value={driverName} icon={<Truck size={13} />} />
                  <Cell label="Ambulance" value={m.ambulance?.ambulanceNumber || '—'} />
                  <Cell label="Dispatcher" value={m.dispatcher?.user?.username || '—'} />
                </div>
                <div className="npc-assigned-actions">
                  <button
                    type="button"
                    className="nurse-btn primary"
                    onClick={() => router.push(`/nurse/patient-care?tab=active&caseId=${m.id}`)}
                  >
                    <Eye size={14} /> Open Case
                  </button>
                  <Link href={`/nurse/medical-records?tab=history&caseId=${m.id}`} className="nurse-btn ghost">
                    View Patient
                  </Link>
                  {m.driver?.phone ? (
                    <a href={`tel:${m.driver.phone}`} className="nurse-btn ghost">
                      <Phone size={14} /> Contact Driver
                    </a>
                  ) : (
                    <Link href="/nurse/communications" className="nurse-btn ghost">
                      <Phone size={14} /> Contact Driver
                    </Link>
                  )}
                </div>
                <p className="npc-updated muted">
                  {format(new Date(m.updatedAt || m.createdAt), 'MMM d, h:mm a')}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Cell({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="npc-cell-label">{icon} {label}</p>
      <p className="npc-cell-value">{value}</p>
    </div>
  )
}
