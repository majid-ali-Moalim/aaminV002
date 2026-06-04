import DriverModulePage from '@/components/driver/DriverModulePage'

export default function Page({
  params,
}: {
  params: { module: string; view: string }
}) {
  return <DriverModulePage moduleId={params.module} view={params.view} />
}
