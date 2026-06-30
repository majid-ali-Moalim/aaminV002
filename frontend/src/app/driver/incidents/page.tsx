import { Suspense } from 'react'
import DriverIncidentsPage from '@/components/driver/DriverIncidentsPage'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="driver-main">
          <div className="driver-card">
            <p className="driver-panel-empty">Loading incident reports…</p>
          </div>
        </div>
      }
    >
      <DriverIncidentsPage />
    </Suspense>
  )
}
