import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/dispatcher/operations/pending-dispatch')
}
