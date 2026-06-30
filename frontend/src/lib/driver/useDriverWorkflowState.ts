'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DriverMission } from '@/lib/stores/driverStore'
import {
  getWorkflowMeta,
  resolveWorkflowStep,
  stepFromBackendStatus,
  type WorkflowStageMeta,
  type WorkflowStepId,
} from './missionWorkflow'

/** Client-only workflow state — avoids hydration mismatch from sessionStorage reads during SSR. */
export function useDriverWorkflowState(mission: DriverMission | null) {
  const [currentStepId, setCurrentStepId] = useState<WorkflowStepId>(() =>
    mission ? stepFromBackendStatus(mission.status) : 'ASSIGNED',
  )
  const [meta, setMeta] = useState<WorkflowStageMeta>({ timestamps: {}, gps: {}, notes: {} })
  const [mounted, setMounted] = useState(false)

  const syncWorkflow = useCallback(() => {
    if (!mission) {
      setCurrentStepId('ASSIGNED')
      setMeta({ timestamps: {}, gps: {}, notes: {} })
      return
    }
    setCurrentStepId(resolveWorkflowStep(mission))
    setMeta(getWorkflowMeta(mission.id))
  }, [mission])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    syncWorkflow()
  }, [mounted, syncWorkflow, mission?.id, mission?.status])

  return { currentStepId, meta, syncWorkflow, mounted }
}
