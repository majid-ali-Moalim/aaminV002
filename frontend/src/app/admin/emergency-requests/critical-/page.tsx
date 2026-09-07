import { redirect } from 'next/navigation'

/** Catch mistaken trailing-slash/dash URLs for Critical Cases. */
export default function CriticalCasesAliasRedirect() {
  redirect('/admin/emergency-requests/critical')
}
