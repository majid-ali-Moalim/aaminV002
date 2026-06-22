'use client'

import PatientCasesView from '@/components/features/patients/PatientCasesView'

export default function EmergencyCasesPage() {
  return (
    <PatientCasesView
      title="Emergency Cases"
      subtitle="Full case archive including completed, cancelled, and closed emergency dispatches."
      heroBadge="Emergency Cases"
    />
  )
}
