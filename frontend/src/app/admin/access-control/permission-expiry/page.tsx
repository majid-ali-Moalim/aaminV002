import { redirect } from 'next/navigation'

export default function LegacyPermissionExpiryRedirect() {
  redirect('/admin/access-control/user-access')
}
