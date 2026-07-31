import { redirect } from 'next/navigation'

export default function StationMaintenancePage() {
  redirect('/admin/stations/operations?tab=ambulances')
}
