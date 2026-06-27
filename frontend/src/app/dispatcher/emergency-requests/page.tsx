import { redirect } from 'next/navigation'

/** Dispatcher emergency hub — pending regional queue is the entry point. */
export default function Page() {
  redirect('/dispatcher/emergency-requests/pending')
}
