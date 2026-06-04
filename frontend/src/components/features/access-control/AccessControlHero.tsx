'use client'

import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type AccessControlHeroProps = {
  badge: string
  title: string
  subtitle: string
  icon: LucideIcon
  actions?: ReactNode
}

export default function AccessControlHero({
  badge,
  title,
  subtitle,
  icon: Icon,
  actions,
}: AccessControlHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Icon className="w-32 h-32" />
      </div>
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">{badge}</p>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-red-100/80 mt-2 max-w-xl text-sm">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
