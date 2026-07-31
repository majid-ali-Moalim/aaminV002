'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Activity, Users, Truck, ArrowLeftRight } from 'lucide-react'
import StationCasesView from '@/components/features/stations/StationCasesView'
import StationStaffView from '@/components/features/stations/StationStaffView'
import StationAmbulancesView from '@/components/features/stations/StationAmbulancesView'
import StationTransfersView from '@/components/features/stations/StationTransfersView'

const TABS = [
  { id: 'cases', label: 'Active Cases', icon: Activity },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'ambulances', label: 'Ambulances', icon: Truck },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
] as const

type TabId = (typeof TABS)[number]['id']

function TabPanel({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'cases':
      return <StationCasesView embedded />
    case 'staff':
      return <StationStaffView embedded />
    case 'ambulances':
      return <StationAmbulancesView embedded />
    case 'transfers':
      return <StationTransfersView embedded />
    default:
      return null
  }
}

export default function StationOperationsView() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId | null) ?? 'cases'
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'cases',
  )

  useEffect(() => {
    const next = searchParams.get('tab') as TabId | null
    if (next && TABS.some((t) => t.id === next)) {
      setTab(next)
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">Live operations</p>
        <h1 className="text-2xl font-black text-slate-900">Station Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Cases, crew, fleet, and inter-station transfers</p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <TabPanel tab={tab} />
    </div>
  )
}
