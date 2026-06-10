import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/nurse/patient-care?tab=treatment')
}
