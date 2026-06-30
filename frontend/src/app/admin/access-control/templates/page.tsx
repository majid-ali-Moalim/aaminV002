import { redirect } from 'next/navigation'

export default function LegacyTemplatesRedirect() {
  redirect('/admin/access-control/permissions')
}
