'use client'

import { Moon, Sun } from 'lucide-react'
import { useDispatcherUiStore } from '@/lib/stores/dispatcherUiStore'

export function DispatcherThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggleTheme } = useDispatcherUiStore()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border transition-colors text-xs font-bold ${
        compact ? 'w-9 h-9' : 'px-3 py-2'
      } border-gray-200 bg-gray-50 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dispatcher-dark:border-slate-600 dispatcher-dark:bg-slate-800 dispatcher-dark:text-slate-200 dispatcher-dark:hover:bg-slate-700`}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      {!compact && <span>{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  )
}
