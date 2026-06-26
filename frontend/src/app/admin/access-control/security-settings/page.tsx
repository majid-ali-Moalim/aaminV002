import { redirect } from 'next/navigation'

export default function SecuritySettingsRedirectPage() {
  redirect('/admin/access-control/permissions')
}
