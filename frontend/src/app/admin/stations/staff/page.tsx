import { redirect } from 'next/navigation'

export default function StationStaffPage() {
  redirect('/admin/stations/operations?tab=staff')
}
