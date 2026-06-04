import { redirect } from 'next/navigation'

export default function LegacyApprovalRequestsRedirect() {
  redirect('/admin/access-control/audit-logs')
}
