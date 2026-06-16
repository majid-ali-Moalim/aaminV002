import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import Link from 'next/link'

export default function HospitalCommunicationsPage() {
  return (
    <HospitalPageLayout title="Communication Center" subtitle="Mission updates from dispatch, drivers, and nurses">
      <div className="hosp-card">
        <p className="text-sm text-slate-600 mb-4">
          Open an active mission to view the live communication timeline. Messages are built from dispatcher notes,
          mission status updates, and nurse clinical notes — all synchronized in real time.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/hospital/emergency-cases?tab=active" className="hosp-btn primary">
            Active Incoming Missions
          </Link>
          <Link href="/hospital/emergency-cases?tab=incoming" className="hosp-btn ghost">
            Incoming Cases
          </Link>
          <Link href="/hospital/notifications" className="hosp-btn ghost">
            Notifications
          </Link>
        </div>
      </div>
    </HospitalPageLayout>
  )
}
