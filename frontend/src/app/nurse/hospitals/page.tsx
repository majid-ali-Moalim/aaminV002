'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseHospitalsView from '@/components/nurse/views/NurseHospitalsView'

export default function NurseHospitalsPage() {
  return (
    <NursePageLayout
      title="Hospitals"
      subtitle="Directory of facilities — hotlines, service numbers, and locations"
    >
      <NurseHospitalsView />
    </NursePageLayout>
  )
}
