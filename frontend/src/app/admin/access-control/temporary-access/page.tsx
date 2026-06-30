import { redirect } from 'next/navigation'

export default function TemporaryAccessRedirectPage() {
  redirect('/admin/access-control/access-management')
}
