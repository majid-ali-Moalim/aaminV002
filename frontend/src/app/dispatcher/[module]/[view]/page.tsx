import DispatcherModulePage from '@/components/dispatcher/DispatcherModulePage'
import type { DispatcherModuleId } from '@/lib/dispatcher/navigation'

const VALID: DispatcherModuleId[] = [
  'operations',
  'ambulances',
  'crew',
  'communications',
  'hospital',
  'tracking',
  'incidents',
  'reports',
  'alerts',
  'tools',
]

export default function Page({
  params,
}: {
  params: { module: string; view: string }
}) {
  if (!VALID.includes(params.module as DispatcherModuleId)) {
    return null
  }
  return (
    <DispatcherModulePage
      moduleId={params.module as DispatcherModuleId}
      view={params.view}
    />
  )
}
