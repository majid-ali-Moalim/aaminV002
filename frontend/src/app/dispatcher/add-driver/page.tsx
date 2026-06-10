'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AddDriverForm from '@/components/drivers/AddDriverForm'
import { usePermissions } from '@/lib/hooks/usePermissions'

export default function DispatcherAddDriverPage() {
  const router = useRouter()
  const { hasGrantedPermission, ready, refresh } = usePermissions()
  const deniedNotified = useRef(false)
  const hadCreatePermission = useRef(false)

  useEffect(() => {
    if (hasGrantedPermission('driver.create')) {
      hadCreatePermission.current = true
    }
  }, [hasGrantedPermission])

  useEffect(() => {
    if (!ready) return
    if (!hasGrantedPermission('driver.create')) {
      // Avoid kicking the user out mid-form when permissions refresh in the background
      if (hadCreatePermission.current) return
      if (!deniedNotified.current) {
        deniedNotified.current = true
        toast.error(
          'Create Driver access is not active. It may have expired — ask your administrator to grant it again (unlimited duration).',
          { duration: 6000 },
        )
      }
      router.replace('/dispatcher/permissions/granted')
    }
  }, [ready, hasGrantedPermission, router])

  if (!ready) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  if (!hasGrantedPermission('driver.create') && !hadCreatePermission.current) {
    return null
  }

  return (
    <AddDriverForm
      listPath="/dispatcher/resources/drivers"
      systemSetupPath="/dispatcher/profile"
      persistKey="dispatcher-add-driver"
      onSubmitForbidden={async (message) => {
        await refresh({ silent: true })
        toast.error(message, { duration: 6000 })
      }}
    />
  )
}
