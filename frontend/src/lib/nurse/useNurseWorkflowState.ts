'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getNurseWorkflowMeta,
  resolveNurseWorkflowStep,
  stepFromBackendStatus,
  type NurseWorkflowMeta,
  type NurseWorkflowStepId,
} from './nurseWorkflow'

/** Client-only workflow state — avoids hydration mismatch from sessionStorage reads during SSR. */
export function useNurseWorkflowState(mission: { id: string; status: string } | null) {
  const [currentStepId, setCurrentStepId] = useState<NurseWorkflowStepId>(() =>
    mission ? stepFromBackendStatus(mission.status) : 'MISSION_ASSIGNED',
  )
  const [meta, setMeta] = useState<NurseWorkflowMeta>({
    timestamps: {},
    activityLog: [],
    completedTasks: {},
  })
  const [mounted, setMounted] = useState(false)

  const syncWorkflow = useCallback(() => {
    if (!mission) {
      setCurrentStepId('MISSION_ASSIGNED')
      setMeta({ timestamps: {}, activityLog: [], completedTasks: {} })
      return
    }
    setCurrentStepId(resolveNurseWorkflowStep(mission))
    setMeta(getNurseWorkflowMeta(mission.id))
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
