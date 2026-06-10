'use client'

import { useMemo } from 'react'
import {
  DISPATCHER_MODULES,
  type NavModule,
} from '@/lib/dispatcher/navigation'
import { getGrantedSidebarModules } from '@/lib/dispatcher/permissionModules'
import { usePermissions } from '@/lib/hooks/usePermissions'

/** Core modules always visible; granted-only modules injected after tools. */
const CORE_MODULE_IDS = new Set([
  'dashboard',
  'emergency',
  'resources',
  'hospital',
  'communications',
  'monitoring',
  'alerts',
  'reports',
  'tools',
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

    const toolsIdx = core.findIndex((m) => m.id === 'tools')
    const insertAt = toolsIdx >= 0 ? toolsIdx + 1 : core.length - 2
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
