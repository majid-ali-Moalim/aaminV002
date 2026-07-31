import { redirect } from 'next/navigation'

export default function AllStationsPage() {
  redirect('/admin/stations/manage')
}
