'use client'

import { useMemo } from 'react'
import {
  DISPATCHER_MODULES,
  type NavModule,
} from '@/lib/dispatcher/navigation'
import { getGrantedSidebarModules } from '@/lib/dispatcher/permissionModules'
import { usePermissions } from '@/lib/hooks/usePermissions'

/** Core modules in Operations section (Emergency Command items are rendered separately). */
const CORE_MODULE_IDS = new Set([
  'hospital',
  'monitoring',
  'alerts',
  'reports',
  'permissions',
  'profile',
])

export function useDispatcherNavigation() {
  const { permissions, grantedKeys, baselineKeys, loading } = usePermissions()

  const sidebarModules = useMemo(() => {
    const core = DISPATCHER_MODULES.filter((m) => CORE_MODULE_IDS.has(m.id))
    const grantedModules = getGrantedSidebarModules(grantedKeys).filter(
      (m) => !CORE_MODULE_IDS.has(m.id),
    )

    const reportsIdx = core.findIndex((m) => m.id === 'reports')
    const insertAt = reportsIdx >= 0 ? reportsIdx + 1 : core.length - 2
    const before = core.slice(0, insertAt)
    const after = core.slice(insertAt)

    return [...before, ...grantedModules, ...after] as NavModule[]
  }, [grantedKeys])

  return {
    sidebarModules,
    permissions,
    grantedKeys,
    baselineKeys,
    loading,
  }
}
