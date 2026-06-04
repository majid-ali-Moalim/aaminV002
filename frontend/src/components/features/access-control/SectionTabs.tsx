'use client'

import { cn } from '@/lib/utils'

type Tab = {
  id: string
  label: string
}

interface SectionTabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export default function SectionTabs({ tabs, active, onChange, className }: SectionTabsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-bold transition-all',
            active === tab.id
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-red-200 hover:text-red-600',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
