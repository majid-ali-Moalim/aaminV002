import { redirect } from 'next/navigation'

export default function LegacyUserPermissionsRedirect() {
  redirect('/admin/access-control/permissions')
}
