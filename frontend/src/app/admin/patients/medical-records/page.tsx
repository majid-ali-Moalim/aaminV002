import { redirect } from 'next/navigation'

export default function NurseMedicalRecordsRedirectPage() {
  redirect('/admin/nurses/clinical-records?tab=records')
}
