import { redirect } from 'next/navigation'

export default function TreatmentRecordsRedirectPage() {
  redirect('/admin/nurses/clinical-records?tab=treatment')
}
