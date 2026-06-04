'use client'

import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import PatientTransportView from '@/components/driver/views/PatientTransportView'

export default function PatientTransportPage() {
  const mod = getModuleById('transport')!

  return (
    <DriverPageLayout title="Patient Transport">
      <DriverModuleShell module={mod} description="Patient information, transport tracking, and handover confirmation.">
        <PatientTransportView />
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
