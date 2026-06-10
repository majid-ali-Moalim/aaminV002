'use client'

import MissionExecutionDashboard from '@/components/driver/mission-workflow/MissionExecutionDashboard'

/** Driver's primary mission command center — live workflow, GPS, comms, status updates */
export default function MissionsActiveView() {
  return <MissionExecutionDashboard mode="active" />
}
