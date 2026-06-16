import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalProfileView from '@/components/hospital/views/HospitalProfileView'

export default function HospitalProfilePage() {
  return (
    <HospitalPageLayout title="My Profile" subtitle="Hospital information, contacts, and account settings">
      <HospitalProfileView />
    </HospitalPageLayout>
  )
}
