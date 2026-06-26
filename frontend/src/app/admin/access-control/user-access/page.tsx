import { redirect } from 'next/navigation'

export default function UserAccessRedirectPage() {
  redirect('/admin/access-control/permissions')
}
