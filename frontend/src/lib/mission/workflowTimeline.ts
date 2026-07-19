export type WorkflowButtonState = 'completed' | 'active' | 'locked'

export function getWorkflowTimelineState(buttons: { state: WorkflowButtonState }[]) {
  const reachedIndex = buttons.reduce(
    (last, b, i) => (b.state === 'completed' ? i : last),
    -1,
  )
  const activeIndex = buttons.findIndex((b) => b.state === 'active')
  const allComplete = buttons.length > 0 && buttons.every((b) => b.state === 'completed')
  return { reachedIndex, activeIndex, allComplete }
}

export function getTimelineActiveIndex(buttons: { state: WorkflowButtonState }[]): number {
  const { reachedIndex, activeIndex, allComplete } = getWorkflowTimelineState(buttons)
  if (allComplete) return Math.max(buttons.length - 1, 0)
  if (activeIndex >= 0) return activeIndex
  const nextLocked = buttons.findIndex((b) => b.state === 'locked')
  if (nextLocked >= 0) return nextLocked
  return Math.max(reachedIndex, 0)
}

/** Timeline dots mirror buttons, but the next locked step pulses while waiting. */
export function getTimelineButtonStates(buttons: { state: WorkflowButtonState }[]): WorkflowButtonState[] {
  if (buttons.some((b) => b.state === 'active')) {
    return buttons.map((b) => b.state)
  }
  const nextLocked = buttons.findIndex((b) => b.state === 'locked')
  if (nextLocked < 0) {
    return buttons.map((b) => b.state)
  }
  return buttons.map((b, i) => {
    if (b.state === 'completed') return 'completed'
    if (i === nextLocked) return 'active'
    return 'locked'
  })
}
