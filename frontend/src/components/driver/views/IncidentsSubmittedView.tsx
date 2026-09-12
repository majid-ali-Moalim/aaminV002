'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { DriverPanel } from '@/components/driver/DriverModuleShell'
import { driverIncidentsApi } from '@/lib/driverApi'

type IncidentRow = {
  id: string
  title: string
  type: string
  priority: string
  trackingCode: string
  submittedAt: string
}

export default function IncidentsSubmittedView() {
  const [reports, setReports] = useState<IncidentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void driverIncidentsApi
      .list()
      .then((rows) => setReports(Array.isArray(rows) ? rows : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="driver-loading-inline">
        <Loader2 className="animate-spin" size={24} />
        <span>Loading reports…</span>
      </div>
    )
  }

  return (
    <div className="driver-list-stack">
      {reports.length === 0 ? (
        <DriverPanel empty="No submitted reports yet." />
      ) : (
        reports.map((r) => (
          <div key={r.id} className="driver-mission-list-card">
            <div className="driver-mlc-top">
              <span className="driver-mlc-code">{r.title}</span>
              <span className="driver-status-chip amber">{r.priority}</span>
            </div>
            <p className="driver-mlc-row">
              {r.type} · {r.trackingCode} ·{' '}
              {format(new Date(r.submittedAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
