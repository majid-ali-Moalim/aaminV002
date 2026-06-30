import { redirect } from 'next/navigation'

export default function NurseCareRecordsRedirectPage() {
  redirect('/admin/nurses/clinical-records?tab=assessments')
}
