'use client'

import { format } from 'date-fns'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WorkflowButtonState } from '@/lib/mission/workflowTimeline'
import { getWorkflowTimelineState } from '@/lib/mission/workflowTimeline'

export type HorizontalTimelineStep = {
  id: string
  label: string
  shortLabel?: string
  icon?: LucideIcon
}

type Props = {
  steps: HorizontalTimelineStep[]
  activeIndex: number
  completed?: boolean
  classPrefix?: 'dcw' | 'nmw'
  currentStepLabel?: string
  getStepTime?: (stepIndex: number) => string | null
  onStepClick?: (index: number, step: HorizontalTimelineStep) => void
  /** When provided, timeline dots mirror workflow button states exactly. */
  buttonStates?: WorkflowButtonState[]
}

export default function MissionHorizontalTimeline({
  steps,
  activeIndex,
  completed = false,
  classPrefix = 'dcw',
  currentStepLabel,
  getStepTime,
  onStepClick,
  buttonStates,
}: Props) {
  const synced = buttonStates && buttonStates.length === steps.length
  const { reachedIndex, activeIndex: syncedActive, allComplete } = synced
    ? getWorkflowTimelineState(buttonStates.map((state) => ({ state })))
    : { reachedIndex: completed ? steps.length - 1 : Math.max(activeIndex - 1, -1), activeIndex, allComplete: completed }

  const displayActiveIndex = synced
    ? syncedActive >= 0
      ? syncedActive
      : Math.max(reachedIndex, 0)
    : activeIndex

  const maxIndex = Math.max(steps.length - 1, 1)
  const fillPct = allComplete
    ? 100
    : Math.round((Math.max(reachedIndex, 0) / maxIndex) * 100)

  return (
    <div className={`${classPrefix}-timeline-h-wrap`} role="list" aria-label="Case progress">
      <div className={`${classPrefix}-timeline-h-track`} aria-hidden>
        <div className={`${classPrefix}-timeline-h-fill`} style={{ width: `${fillPct}%` }} />
      </div>
      <ol className={`${classPrefix}-timeline-h`}>
        {steps.map((step, i) => {
          const btnState = synced ? buttonStates[i] : null
          const done = btnState
            ? btnState === 'completed'
            : completed || i < activeIndex
          const active = btnState
            ? btnState === 'active'
            : !completed && i === displayActiveIndex
          const upcoming = !done && !active
          const Icon = step.icon
          const ts = getStepTime?.(i)
          const clickable = Boolean(onStepClick) && (done || active)

          return (
            <li
              key={step.id}
              role="listitem"
              className={`${classPrefix}-timeline-h-item${done ? ' done' : ''}${active ? ' active' : ''}${upcoming ? ' upcoming' : ''}${clickable ? ' clickable' : ''}`}
            >
              <button
                type="button"
                className={`${classPrefix}-timeline-h-step`}
                disabled={!clickable}
                onClick={() => onStepClick?.(i, step)}
                aria-current={active ? 'step' : undefined}
                aria-label={`${step.label}${active && currentStepLabel ? ` — ${currentStepLabel}` : ''}`}
              >
                <span className={`${classPrefix}-timeline-h-dot`}>
                  {done ? (
                    <Check size={14} strokeWidth={3} />
                  ) : Icon ? (
                    <Icon size={14} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </span>
                <span className={`${classPrefix}-timeline-h-label`}>{step.shortLabel || step.label}</span>
                {active && currentStepLabel && (
                  <span className={`${classPrefix}-timeline-h-current`}>{currentStepLabel}</span>
                )}
                {ts && (
                  <span className={`${classPrefix}-timeline-h-time`}>{format(new Date(ts), 'h:mm a')}</span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
