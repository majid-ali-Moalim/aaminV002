import { redirect } from 'next/navigation'
import DriverModulePage from '@/components/driver/DriverModulePage'

export default function Page({
  params,
}: {
  params: { module: string; view: string }
}) {
  if (params.module === 'incidents') {
    redirect(
      params.view === 'submitted'
        ? '/driver/incidents?tab=submitted'
        : '/driver/incidents',
    )
  }
  return <DriverModulePage moduleId={params.module} view={params.view} />
}
