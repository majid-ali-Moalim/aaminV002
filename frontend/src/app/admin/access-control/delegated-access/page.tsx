import { redirect } from 'next/navigation'

export default function DelegatedAccessRedirectPage() {
  redirect('/admin/access-control/permissions')
}
