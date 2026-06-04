'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, Search, Loader2, Inbox } from 'lucide-react'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import { activityLogsService } from '@/lib/api'
import { format } from 'date-fns'

type TempAccessLog = {
  id: string
  action: string
  createdAt: string
  metadata?: Record<string, unknown> | null
  user?: {
    username: string
    employee?: { firstName?: string | null; lastName?: string | null } | null
  }
}

function actorName(log: TempAccessLog) {
  const emp = log.user?.employee
  if (emp?.firstName || emp?.lastName) {
    return [emp.firstName, emp.lastName].filter(Boolean).join(' ')
  }
  return log.user?.username ?? 'Unknown'
}

export default function TemporaryAccessPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [records, setRecords] = useState<TempAccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const logs = await activityLogsService.getAll({ limit: 200 })
        const list = (Array.isArray(logs) ? logs : []).filter((log: TempAccessLog) => {
          const action = log.action.toLowerCase()
          return (
            action.includes('temporary') ||
            action.includes('temp access') ||
            action.includes('grant') ||
            action.includes('revoke')
          )
        })
        setRecords(list)
      } catch (err) {
        console.error(err)
        setError('Failed to load temporary access records.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        const q = searchTerm.toLowerCase()
        return (
          r.action.toLowerCase().includes(q) ||
          actorName(r).toLowerCase().includes(q)
        )
      }),
    [records, searchTerm],
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Time-Limited Grants"
        title="Temporary Access"
        subtitle="Short-term permission grants and revocations recorded in the activity log."
        icon={Clock}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search temporary access…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading temporary access records…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-bold text-slate-700">No temporary access records</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            No temporary grants or revocations have been logged yet. They will appear here when recorded in the audit trail.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {filtered.map((entry) => (
            <div key={entry.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  <span className="text-red-600">{actorName(entry)}</span> — {entry.action}
                </p>
              </div>
              <p className="text-xs text-slate-400 shrink-0">
                {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
