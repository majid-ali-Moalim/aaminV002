'use client'

import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import Link from 'next/link'
import { useNotificationStore } from '@/lib/stores/notificationStore'

export default function HospitalNotificationsPage() {
  const { recent } = useNotificationStore()

  return (
    <HospitalPageLayout title="Notifications" subtitle="Emergency alerts and system messages">
      <div className="hosp-card-list">
        {recent.length === 0 && <div className="hosp-empty">No notifications yet.</div>}
        {recent.map((n) => (
          <article key={n.id} className="hosp-case-card">
            <p className="font-bold">{n.title}</p>
            <p className="text-sm text-slate-600">{n.message}</p>
            {n.redirectUrl && (
              <Link href={n.redirectUrl.startsWith('/hospital') ? n.redirectUrl : '/hospital/emergency-cases'} className="text-teal-700 text-sm font-semibold">
                Open related page →
              </Link>
            )}
          </article>
        ))}
      </div>
    </HospitalPageLayout>
  )
}
