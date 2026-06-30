'use client'

import { useMemo } from 'react'
import { DISPATCHER_MODULES, type NavModule } from '@/lib/dispatcher/navigation'
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

  const sidebarModules = useMemo(
    () => DISPATCHER_MODULES.filter((m) => CORE_MODULE_IDS.has(m.id)) as NavModule[],
    [],
  )

  return {
    sidebarModules,
    permissions,
    grantedKeys,
    baselineKeys,
    loading,
  }
}
