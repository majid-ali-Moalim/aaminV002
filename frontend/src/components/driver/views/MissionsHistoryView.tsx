'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { driverMissionsApi } from '@/lib/driverApi'
import { MissionStatusBadge, PriorityBadge, DriverSkeleton } from '@/components/driver/DriverUI'
import { MapPin, User, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function MissionsHistoryView() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('COMPLETED')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await driverMissionsApi.getHistory(page, 15, statusFilter)
      setHistory(data.missions || [])
      setTotalPages(data.totalPages || 1)
    } catch (_) {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="driver-history-wrap">
      <div className="driver-filter-row">
        {['COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            type="button"
            className={`driver-filter-chip${statusFilter === s ? ' active' : ''}`}
            onClick={() => { setStatusFilter(s); setPage(1) }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="driver-card"><DriverSkeleton lines={5} /></div>
      ) : !history.length ? (
        <p className="driver-panel-empty">No missions found for this filter.</p>
      ) : (
        <div className="driver-list-stack">
          {history.map((m) => (
            <Link key={m.id} href={`/driver/mission?caseId=${m.id}`} className="driver-mission-list-card">
              <div className="driver-mlc-top">
                <span className="driver-mlc-code">{m.trackingCode}</span>
                <div className="driver-mlc-badges">
                  <MissionStatusBadge status={m.status} />
                  <PriorityBadge priority={m.priority} />
                </div>
              </div>
              <div className="driver-mlc-row"><User size={13} /><span>{m.patient?.fullName || 'Unknown'}</span></div>
              <div className="driver-mlc-row"><MapPin size={13} /><span>{m.pickupLocation}</span></div>
              <div className="driver-mlc-footer">
                <span>{m.completedAt ? format(new Date(m.completedAt), 'MMM d, yyyy h:mm a') : '—'}</span>
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="driver-pagination">
          <button type="button" className="driver-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="driver-page-info">Page {page} of {totalPages}</span>
          <button type="button" className="driver-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
