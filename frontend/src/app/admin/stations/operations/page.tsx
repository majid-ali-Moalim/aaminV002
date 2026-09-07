import { redirect } from 'next/navigation'

/** Operations menu removed — keep old links working. */
export default function StationOperationsRedirect() {
  redirect('/admin/stations')
}
