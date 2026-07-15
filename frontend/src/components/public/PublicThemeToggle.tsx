'use client'

import { Moon, Sun } from 'lucide-react'
import { usePublicUiStore } from '@/lib/stores/publicUiStore'

type Props = {
  compact?: boolean
  className?: string
}

export function PublicThemeToggle({ compact, className = '' }: Props) {
  const { theme, toggleTheme } = usePublicUiStore()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border transition-colors ${
        compact ? 'h-9 w-9' : 'h-10 px-3'
      } border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      {!compact && <span className="text-xs font-bold uppercase tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
    </button>
  )
}
