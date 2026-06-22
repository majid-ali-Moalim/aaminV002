'use client'

import { useEffect, useState } from 'react'
import { Activity, Loader2, MonitorSmartphone, Shield } from 'lucide-react'
import { authService } from '@/lib/api'

type SecurityActivity = {
  lastPasswordChangedAt: string | null
  lastLoginAt: string | null
  lastFailedLoginAt: string | null
  activeSessionsCount: number
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Never recorded'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function SecurityActivityCard({
  refreshKey = 0,
  variant = 'light',
}: {
  refreshKey?: number
  variant?: 'light' | 'dark'
}) {
  const [data, setData] = useState<SecurityActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService
      .getSecurityActivity()
      .then((res: SecurityActivity) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const isDark = variant === 'dark'

  return (
    <div
      className={`rounded-2xl border p-6 space-y-4 ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-zinc-900' : 'bg-slate-100'
          }`}
        >
          <Shield className={`w-5 h-5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`} />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase text-red-500 tracking-widest">
            Recent Security Activity
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Account security and session information
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
        </div>
      ) : (
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { icon: Activity, label: 'Last Password Change', value: formatDateTime(data?.lastPasswordChangedAt ?? null) },
            { icon: Activity, label: 'Last Login', value: formatDateTime(data?.lastLoginAt ?? null) },
            { icon: Activity, label: 'Last Failed Login', value: formatDateTime(data?.lastFailedLoginAt ?? null) },
            {
              icon: MonitorSmartphone,
              label: 'Active Sessions',
              value: `${data?.activeSessionsCount ?? 1} active session${(data?.activeSessionsCount ?? 1) === 1 ? '' : 's'}`,
              hint: 'Current browser session',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-4 ${
                isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <dt
                className={`flex items-center gap-2 text-xs font-bold uppercase ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </dt>
              <dd className={`mt-2 font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.value}</dd>
              {item.hint ? (
                <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{item.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
