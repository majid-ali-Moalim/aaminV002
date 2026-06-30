/** Admin portal sidebar — white / light theme (reference UI) */
export const ADMIN_SIDEBAR = {
  bg: '#FFFFFF',
  panel: '#F3F4F6',
  primary: '#FEE2E2',
  text: '#DC2626',
  secondary: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  hoverText: '#1F2937',
  accent: '#EF2D2D',
  accentText: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
} as const

export type AdminSidebarPalette = typeof ADMIN_SIDEBAR
