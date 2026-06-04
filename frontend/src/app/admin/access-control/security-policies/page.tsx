import { redirect } from 'next/navigation'

export default function LegacySecurityPoliciesRedirect() {
  redirect('/admin/access-control/security-settings')
}
