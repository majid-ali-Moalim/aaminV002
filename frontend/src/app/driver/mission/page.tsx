'use client'

import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverMissionWorkspace from '@/components/driver/mission-workflow/DriverMissionWorkspace'

export default function DriverCaseWorkspacePage() {
  return (
    <DriverPageLayout title="Case Workspace">
      <DriverMissionWorkspace />
    </DriverPageLayout>
  )
}
