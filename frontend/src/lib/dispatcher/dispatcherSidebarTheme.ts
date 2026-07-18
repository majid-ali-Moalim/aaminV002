/** Dispatcher sidebar palette — follows CSS vars on `.dispatcher-shell` (white in light mode). */
export const DISPATCHER_SIDEBAR = {
  bg: 'var(--dsb-sidebar-bg)',
  panel: 'var(--dsb-sidebar-panel)',
  primary: 'var(--dsb-sidebar-primary)',
  text: 'var(--dsb-sidebar-text)',
  textActive: 'var(--dsb-sidebar-text-active)',
  secondary: 'var(--dsb-sidebar-secondary)',
  muted: 'var(--dsb-sidebar-muted)',
  border: 'var(--dsb-sidebar-border)',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
} as const

export const DISPATCHER_SIDEBAR_WORKFLOW_DASH = 'var(--dsb-sidebar-workflow-dash)'
