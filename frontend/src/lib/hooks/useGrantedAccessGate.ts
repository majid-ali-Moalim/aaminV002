'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { getPermissionLabel } from '@/lib/accessControlCatalog'

export function useGrantedAccessGate(permissionKey: string, redirectTo = '/nurse/permissions') {
  const router = useRouter()
  const { hasGrantedPermission, hasPermission, ready, refresh } = usePermissions()
  const deniedNotified = useRef(false)
  const hadAccess = useRef(false)

  const allowed = hasGrantedPermission(permissionKey) || hasPermission(permissionKey)

  useEffect(() => {
    if (allowed) hadAccess.current = true
  }, [allowed])

  useEffect(() => {
    if (!ready) return
    if (allowed) return
    if (hadAccess.current) return
    if (!deniedNotified.current) {
      deniedNotified.current = true
      toast.error(
        `${getPermissionLabel(permissionKey)} is not active. Ask your administrator to grant it again (prefer unlimited duration).`,
        { duration: 6000 },
      )
    }
    router.replace(redirectTo)
  }, [ready, allowed, router, redirectTo, permissionKey])

  return { allowed, ready, refresh, hadAccess: hadAccess.current }
}
