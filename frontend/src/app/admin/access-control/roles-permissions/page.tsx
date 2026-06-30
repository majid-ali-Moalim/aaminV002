import { redirect } from 'next/navigation'

export default function LegacyRolesPermissionsRedirect() {
  redirect('/admin/access-control/permissions')
}
