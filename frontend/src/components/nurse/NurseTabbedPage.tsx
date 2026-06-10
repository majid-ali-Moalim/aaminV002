'use client'

import { Suspense, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import SectionTabs from '@/components/features/access-control/SectionTabs'

type Tab = { id: string; label: string }

type Props = {
  tabs: Tab[]
  defaultTab: string
  paramName?: string
  children: (activeTab: string) => ReactNode
}

function NurseTabbedContent({ tabs, defaultTab, paramName = 'tab', children }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const param = searchParams.get(paramName)
  const active = tabs.some((t) => t.id === param) ? param! : defaultTab

  const setTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, id)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={tabs} active={active} onChange={setTab} className="nurse-tabs" />
      {children(active)}
    </div>
  )
}

export default function NurseTabbedPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <NurseTabbedContent {...props} />
    </Suspense>
  )
}
