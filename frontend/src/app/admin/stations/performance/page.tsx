import { redirect } from 'next/navigation'

export default function StationPerformancePage() {
  redirect('/admin/stations/reports?tab=performance')
}
