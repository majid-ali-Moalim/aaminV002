import { redirect } from 'next/navigation'

export default function PatientRecordsReportsRedirectPage() {
  redirect('/admin/patients/cases')
}
