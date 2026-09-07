import { redirect } from 'next/navigation'

/** Mission Completed menu removed — handovers and case records cover closed cases. */
export default function CompletedCasesRedirect() {
  redirect('/admin/emergency-requests/handover')
}
