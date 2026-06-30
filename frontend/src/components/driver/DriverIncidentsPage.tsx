'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import IncidentsNewView from '@/components/driver/views/IncidentsNewView'
import IncidentsSubmittedView from '@/components/driver/views/IncidentsSubmittedView'

const TABS = [
  { id: 'new', label: 'New Incident' },
  { id: 'submitted', label: 'Submitted Reports' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DriverIncidentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: TabId = tabParam === 'submitted' ? 'submitted' : 'new'
  const [tab, setTab] = useState<TabId>(initialTab)

  useEffect(() => {
    setTab(tabParam === 'submitted' ? 'submitted' : 'new')
  }, [tabParam])

  const selectTab = useCallback(
    (next: TabId) => {
      setTab(next)
      router.replace(next === 'new' ? '/driver/incidents' : '/driver/incidents?tab=submitted', {
        scroll: false,
      })
    },
    [router],
  )

  return (
    <DriverPageLayout title="Incident Reports">
      <div className="driver-module-shell">
        <p className="driver-module-desc">
          Report delays, breakdowns, and safety concerns to dispatch.
        </p>

        <div className="driver-module-tabs-wrap">
          <nav className="driver-module-tabs" aria-label="Incident report views">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`driver-module-tab${tab === item.id ? ' active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="driver-module-body">
          {tab === 'new' ? <IncidentsNewView /> : <IncidentsSubmittedView />}
        </div>
      </div>
    </DriverPageLayout>
  )
}
