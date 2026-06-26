import { redirect } from 'next/navigation'

export default function PatientCareRecordsRedirectPage() {
  redirect('/admin/nurses/clinical-records?tab=records')
}
