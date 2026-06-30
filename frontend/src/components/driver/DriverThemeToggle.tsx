'use client'

import { Moon, Sun } from 'lucide-react'
import { useDriverStore } from '@/lib/stores/driverStore'

export function DriverThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggleTheme } = useDriverStore()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`driver-theme-toggle${compact ? ' driver-theme-toggle--compact' : ''}`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon size={compact ? 16 : 18} /> : <Sun size={compact ? 16 : 18} />}
      {!compact && <span>{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
