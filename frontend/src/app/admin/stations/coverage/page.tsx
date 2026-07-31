import { redirect } from 'next/navigation'

export default function StationCoveragePage() {
  redirect('/admin/stations/reports?tab=coverage')
}
