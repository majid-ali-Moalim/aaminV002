import { redirect } from 'next/navigation'

export default function AddStationPage() {
  redirect('/admin/stations/manage?add=1')
}
