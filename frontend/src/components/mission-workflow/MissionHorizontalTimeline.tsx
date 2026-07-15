'use client'

import { format } from 'date-fns'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

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
}

export default function MissionHorizontalTimeline({
  steps,
  activeIndex,
  completed = false,
  classPrefix = 'dcw',
  currentStepLabel,
  getStepTime,
  onStepClick,
}: Props) {
  const pct =
    steps.length <= 1
      ? 100
      : completed
        ? 100
        : Math.round((activeIndex / Math.max(steps.length - 1, 1)) * 100)

  return (
    <div className={`${classPrefix}-timeline-h-wrap`} role="list" aria-label="Mission progress">
      <div className={`${classPrefix}-timeline-h-track`} aria-hidden>
        <div className={`${classPrefix}-timeline-h-fill`} style={{ width: `${pct}%` }} />
      </div>
      <ol className={`${classPrefix}-timeline-h`}>
        {steps.map((step, i) => {
          const done = completed || i < activeIndex
          const active = !completed && i === activeIndex
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
