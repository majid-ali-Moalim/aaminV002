import { redirect } from 'next/navigation'

export default function StationAmbulancesPage() {
  redirect('/admin/stations/operations?tab=ambulances')
}
