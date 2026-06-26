'use client'

import { Moon, Sun } from 'lucide-react'
import { useAdminUiStore } from '@/lib/stores/adminUiStore'

export function AdminThemeToggle({ compact, onDark }: { compact?: boolean; onDark?: boolean }) {
  const { theme, toggleTheme } = useAdminUiStore()
  const isLight = theme === 'light'

  const baseClass = onDark
    ? compact
      ? 'w-9 h-9 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-red-500/40 hover:text-white'
      : 'w-full border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-red-500/40 hover:text-white'
    : compact
      ? 'w-9 h-9 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-200 dark:hover:border-red-900 hover:text-red-600'
      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-slate-700'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border transition-colors ${
        compact && !onDark ? 'w-9 h-9' : onDark && !compact ? 'w-full px-3 py-2' : compact ? '' : 'px-3 py-2'
      } ${baseClass} text-xs font-bold`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      {!compact && <span>{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
