import { redirect } from 'next/navigation'

export default function StationTransfersPage() {
  redirect('/admin/stations/operations?tab=transfers')
}
