'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getModuleById, type DriverModuleId } from '@/lib/driver/navigation'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import { resolvePageTitle } from '@/lib/driver/navigation'
import { usePathname } from 'next/navigation'
import MissionsActiveView from '@/components/driver/views/MissionsActiveView'
import MissionsAssignedView from '@/components/driver/views/MissionsAssignedView'
import MissionsWorkflowView from '@/components/driver/views/MissionsWorkflowView'
import MissionsHistoryView from '@/components/driver/views/MissionsHistoryView'
import IncidentsNewView from '@/components/driver/views/IncidentsNewView'
import IncidentsSubmittedView from '@/components/driver/views/IncidentsSubmittedView'

const DESCRIPTIONS: Partial<Record<DriverModuleId, string>> = {
  missions: 'Mission execution — accept, progress, and complete emergency assignments.',
  incidents: 'Report delays, breakdowns, and safety concerns to dispatch.',
}

const VIEW_DESCRIPTIONS: Partial<Record<string, string>> = {
  active: 'Live mission command — navigate, update status, communicate, and complete your active case.',
  assigned: 'Review and accept new dispatch assignments before starting your mission.',
  workflow: 'Step-by-step mission execution tracker from assignment to completion.',
  history: 'Completed and cancelled missions archive.',
}

interface Props {
  moduleId: string
  view: string
}

export default function DriverModulePage({ moduleId, view }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const mod = getModuleById(moduleId as DriverModuleId)

  useEffect(() => {
    if (!mod) router.replace('/driver')
  }, [mod, router])

  if (!mod) return null

  const title = resolvePageTitle(pathname)
  const viewDescription = VIEW_DESCRIPTIONS[view] ?? DESCRIPTIONS[mod.id]

  const content = (() => {
    if (moduleId === 'missions') {
      switch (view) {
        case 'active':
          return <MissionsActiveView />
        case 'assigned':
          return <MissionsAssignedView />
        case 'workflow':
          return <MissionsWorkflowView />
        case 'history':
          return <MissionsHistoryView />
        default:
          return null
      }
    }
    if (moduleId === 'incidents') {
      switch (view) {
        case 'new':
          return <IncidentsNewView />
        case 'submitted':
          return <IncidentsSubmittedView />
        default:
          return null
      }
    }
    return null
  })()

  return (
    <DriverPageLayout title={title}>
      <DriverModuleShell module={mod} description={viewDescription}>
        {content}
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
