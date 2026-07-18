'use client'

import { Moon, Sun } from 'lucide-react'
import { useNurseStore } from '@/lib/stores/nurseStore'

export function NurseThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggleTheme } = useNurseStore()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`nurse-theme-toggle${compact ? ' nurse-theme-toggle--compact' : ''}`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon size={compact ? 16 : 18} /> : <Sun size={compact ? 16 : 18} />}
      {!compact && <span>{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
