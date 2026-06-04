'use client'

import PatientCasesView from '@/components/features/patients/PatientCasesView'

export default function ActiveCasesPage() {
  return (
    <PatientCasesView
      title="Active Cases"
      subtitle="Cases currently in progress — pending, dispatched, or in transit."
      heroBadge="Active Cases"
      activeOnly
      hideStatusFilter
    />
  )
}
