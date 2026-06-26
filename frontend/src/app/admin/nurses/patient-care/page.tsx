import { redirect } from 'next/navigation'

export default function PatientCareRedirectPage() {
  redirect('/admin/nurses/clinical-records?tab=assessments')
}
