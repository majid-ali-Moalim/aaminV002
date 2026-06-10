'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { accessControlService } from '@/lib/api'
import { getBaselinePermissionsForUser } from '@/lib/accessControlCatalog'

export function usePermissions() {
  const { user, token } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [baselineKeys, setBaselineKeys] = useState<string[]>([])
  const [grantedKeys, setGrantedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const initialLoadDone = useRef(false)

  const applyPayload = useCallback(
    (data: {
      activePermissionKeys?: string[]
      baselinePermissions?: string[]
      activeGrantedKeys?: string[]
      grantedPermissions?: Array<{ permissionKey: string; isExpired: boolean }>
    }) => {
      const baseline = data.baselinePermissions ?? []
      const granted =
        data.activeGrantedKeys ??
        data.grantedPermissions?.filter((g) => !g.isExpired).map((g) => g.permissionKey) ??
        []
      const active = data.activePermissionKeys ?? [...new Set([...baseline, ...granted])]

      setBaselineKeys(baseline)
      setGrantedKeys(granted)
      setPermissions(active)
      setReady(true)

      if (typeof window !== 'undefined' && user) {
        const stored = localStorage.getItem('user')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.permissions = active
            parsed.activePermissionKeys = active
            parsed.baselinePermissions = baseline
            parsed.activeGrantedKeys = granted
            localStorage.setItem('user', JSON.stringify(parsed))
          } catch {
            /* ignore */
          }
        }
      }
    },
    [user],
  )

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? initialLoadDone.current

      if (!token) {
        setLoading(false)
        setReady(true)
        return
      }

      if (!silent) {
        setLoading(true)
      }

      try {
        const data = await accessControlService.getMyPermissions()
        applyPayload(data)
      } catch {
        if (!silent) {
          const u = user as {
            role?: string
            employeeRole?: string
            employee?: { employeeRole?: { name?: string } }
          } | null
          if (u) {
            const baseline = getBaselinePermissionsForUser(
              u.role ?? 'EMPLOYEE',
              u.role === 'ADMIN' ? 'administrator' : u.employeeRole ?? u.employee?.employeeRole?.name,
            )
            setBaselineKeys(baseline)
            setGrantedKeys([])
            setPermissions(baseline)
          }
        }
        setReady(true)
      } finally {
        initialLoadDone.current = true
        setLoading(false)
      }
    },
    [token, user, applyPayload],
  )

  useEffect(() => {
    void refresh({ silent: false })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps -- only re-load when session changes, not when user profile updates

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onFocus = () => {
      if (!initialLoadDone.current) return
      clearTimeout(timer)
      // File picker close triggers focus — refresh silently without unmounting forms
      timer = setTimeout(() => {
        void refresh({ silent: true })
      }, 800)
    }
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const hasPermission = useCallback(
    (key: string) => permissions.includes(key),
    [permissions],
  )

  /** Admin-granted permission still active (never inferred from stale JWT). */
  const hasGrantedPermission = useCallback(
    (key: string) => grantedKeys.includes(key),
    [grantedKeys],
  )

  return {
    permissions,
    baselineKeys,
    grantedKeys,
    hasPermission,
    hasGrantedPermission,
    loading,
    ready,
    refresh,
  }
}
