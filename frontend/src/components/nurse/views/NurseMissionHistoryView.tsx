'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight, Loader2, MapPin, User } from 'lucide-react'
import { useNurseCases } from '@/lib/nurse/useNurseCases'

const CLOSED = ['COMPLETED', 'CANCELLED']

export default function NurseMissionHistoryView() {
  const { cases, loading } = useNurseCases(30000)

  const history = useMemo(
    () =>
      cases
        .filter((c) => CLOSED.includes(c.status))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        ),
    [cases],
  )

  if (loading) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  if (!history.length) {
    return (
      <div className="nurse-empty-card">
        No completed cases yet. Closed missions will appear here for read-only review.
      </div>
    )
  }

  return (
    <div className="nurse-card-stack">
      {history.map((m) => (
        <Link
          key={m.id}
          href={`/nurse/mission?caseId=${m.id}`}
          className="nurse-notif-card clickable"
        >
          <div className="nurse-notif-card-top">
            <span className="nurse-case-code">{m.trackingCode}</span>
            <span className={`nurse-priority ${m.priority?.toLowerCase()}`}>{m.priority}</span>
          </div>
          <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
            <User size={13} /> {m.patient?.fullName || m.callerName || 'Patient'}
          </p>
          <p className="text-sm text-zinc-500 flex items-center gap-2">
            <MapPin size={13} /> {m.pickupLocation || '—'}
          </p>
          <div className="nurse-notif-footer">
            <span className="nurse-notif-time">
              {m.updatedAt ? format(new Date(m.updatedAt), 'MMM d, yyyy h:mm a') : '—'}
            </span>
            <span className="nurse-status-chip">{m.status?.replace(/_/g, ' ')}</span>
            <ChevronRight size={14} className="nurse-notif-link-icon" />
          </div>
        </Link>
      ))}
    </div>
  )
}
