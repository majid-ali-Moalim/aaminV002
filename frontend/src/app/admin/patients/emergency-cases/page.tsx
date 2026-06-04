'use client'

import PatientCasesView from '@/components/features/patients/PatientCasesView'

export default function EmergencyCasesPage() {
  return (
    <PatientCasesView
      title="Emergency Cases"
      subtitle="Complete archive of all emergency dispatch cases and patient encounters."
      heroBadge="Emergency Cases"
    />
  )
}
