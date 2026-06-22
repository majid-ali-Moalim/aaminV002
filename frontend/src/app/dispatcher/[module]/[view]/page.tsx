import { redirect } from 'next/navigation'
import DispatcherModulePage from '@/components/dispatcher/DispatcherModulePage'
import type { DispatcherModuleId } from '@/lib/dispatcher/navigation'

const VALID: DispatcherModuleId[] = [
  'emergency',
  'resources',
  'hospital',
  'monitoring',
  'reports',
  'alerts',
  'permissions',
]

const REMOVED_MODULES = new Set(['communications', 'tools'])

export default function Page({
  params,
}: {
  params: { module: string; view: string }
}) {
  if (REMOVED_MODULES.has(params.module)) {
    redirect('/dispatcher/dashboard')
  }
  if (!VALID.includes(params.module as DispatcherModuleId)) {
    redirect('/dispatcher/dashboard')
  }
  return (
    <DispatcherModulePage
      moduleId={params.module as DispatcherModuleId}
      view={params.view}
    />
  )
}
