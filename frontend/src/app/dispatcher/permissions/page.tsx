'use client'

import PortalPermissionsView from '@/components/permissions/PortalPermissionsView'

export default function DispatcherPermissionsPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black text-slate-900">My Permissions</h1>
        <p className="text-sm text-slate-500 mt-1">Administrator-granted access for your dispatcher account</p>
      </div>
      <PortalPermissionsView portal="dispatcher" />
    </div>
  )
}
