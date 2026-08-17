'use client'

import { CheckCircle2, Lock } from 'lucide-react'

type ButtonDef = {
  id: string
  label: string
  state: 'completed' | 'active' | 'locked'
  waitReason?: string
  editable?: boolean
}

type Props = {
  buttons: ButtonDef[]
  onAction: (id: string) => void
  classPrefix: 'dcw' | 'nmw'
  readOnly?: boolean
  /** Show only the next action — for fast critical-case workflows */
  activeOnly?: boolean
}

export default function MissionWorkflowButtons({
  buttons,
  onAction,
  classPrefix,
  readOnly,
  activeOnly = false,
}: Props) {
  const visible = activeOnly
    ? buttons.filter((b) => b.state === 'active')
    : buttons

  if (activeOnly && visible.length === 0) {
    const waiting = buttons.find((b) => b.state === 'locked')
    if (waiting?.waitReason) {
      return (
        <p className={`${classPrefix}-workflow-waiting text-sm opacity-80`}>
          {waiting.waitReason}
        </p>
      )
    }
  }

  return (
    <div className={`${classPrefix}-workflow-buttons${activeOnly ? ` ${classPrefix}-workflow-buttons--single` : ''}`}>
      {visible.map((btn) => {
        const isLocked = btn.state === 'locked'
        const isDone = btn.state === 'completed'
        const isActive = btn.state === 'active'
        const isEditableDone = isDone && btn.editable

        return (
          <button
            key={btn.id}
            type="button"
            className={`${classPrefix}-workflow-btn${isDone ? ' done' : ''}${isEditableDone ? ' editable' : ''}${isActive ? ' active' : ''}${isLocked ? ' locked' : ''}`}
            disabled={readOnly || isLocked || (isDone && !btn.editable)}
            onClick={() => onAction(btn.id)}
          >
            <span className={`${classPrefix}-workflow-btn-icon`}>
              {isDone ? (
                <CheckCircle2 size={16} />
              ) : isLocked ? (
                <Lock size={14} />
              ) : (
                <span className={`${classPrefix}-workflow-btn-dot`} />
              )}
            </span>
            <span className={`${classPrefix}-workflow-btn-label`}>{btn.label}</span>
            {isLocked && btn.waitReason && (
              <span className={`${classPrefix}-workflow-btn-wait`}>{btn.waitReason}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
