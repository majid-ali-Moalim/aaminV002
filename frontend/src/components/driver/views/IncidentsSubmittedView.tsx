'use client'

import { DriverPanel } from '@/components/driver/DriverModuleShell'

const MOCK_REPORTS = [
  { id: '1', title: 'Traffic delay on Main St', type: 'Traffic Delay', status: 'Resolved', date: 'May 28, 2026' },
  { id: '2', title: 'Radio intermittent', type: 'Communication Failure', status: 'Under Review', date: 'May 27, 2026' },
]

export default function IncidentsSubmittedView() {
  return (
    <div className="driver-list-stack">
      {MOCK_REPORTS.length === 0 ? (
        <DriverPanel empty="No submitted reports yet." />
      ) : (
        MOCK_REPORTS.map((r) => (
          <div key={r.id} className="driver-mission-list-card">
            <div className="driver-mlc-top">
              <span className="driver-mlc-code">{r.title}</span>
              <span className={`driver-status-chip ${r.status === 'Resolved' ? 'green' : 'amber'}`}>{r.status}</span>
            </div>
            <p className="driver-mlc-row">{r.type} · {r.date}</p>
          </div>
        ))
      )}
    </div>
  )
}
