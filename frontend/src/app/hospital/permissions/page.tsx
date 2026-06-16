'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import { accessControlService } from '@/lib/api'

export default function HospitalPermissionsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    accessControlService
      .getMyPermissions()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const baseline = data?.baselinePermissions ?? []
  const active = data?.activePermissionKeys ?? baseline
  const grants = data?.grantedPermissions ?? []

  return (
    <HospitalPageLayout
      title="My Permissions"
      subtitle="Review your hospital operations privileges and additional access grants"
    >
      {loading ? (
        <div className="hosp-loading"><Loader2 className="animate-spin" size={24} /></div>
      ) : (
        <div className="hosp-ops-grid">
          <section className="hosp-card">
            <h3>Active Permissions</h3>
            <div className="hosp-permission-grid">
              {active.length === 0 && <p className="hosp-card-copy">No active permissions found.</p>}
              {active.map((permission: string) => (
                <span className="hosp-permission-chip" key={permission}>
                  <ShieldCheck size={14} />
                  {permission}
                </span>
              ))}
            </div>
          </section>

          <section className="hosp-card">
            <h3>Additional Grants</h3>
            <div className="hosp-permission-list">
              {grants.length === 0 && <p className="hosp-card-copy">No additional permission grants.</p>}
              {grants.map((grant: any) => (
                <div className="hosp-permission-grant" key={`${grant.permissionKey}-${grant.grantedAt}`}>
                  <strong>{grant.permissionKey}</strong>
                  <span>
                    {grant.isUnlimited
                      ? 'Unlimited'
                      : grant.expiresAt
                        ? `Expires ${new Date(grant.expiresAt).toLocaleDateString()}`
                        : 'No expiry set'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </HospitalPageLayout>
  )
}
