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
}

export default function MissionWorkflowButtons({ buttons, onAction, classPrefix, readOnly }: Props) {
  return (
    <div className={`${classPrefix}-workflow-buttons`}>
      {buttons.map((btn) => {
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
