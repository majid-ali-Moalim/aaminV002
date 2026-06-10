import DispatcherModulePage from '@/components/dispatcher/DispatcherModulePage'
import type { DispatcherModuleId } from '@/lib/dispatcher/navigation'

const VALID: DispatcherModuleId[] = [
  'emergency',
  'resources',
  'communications',
  'hospital',
  'monitoring',
  'reports',
  'alerts',
  'tools',
  'permissions',
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
