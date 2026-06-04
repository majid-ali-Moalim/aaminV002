'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ScrollText,
  Terminal,
  Shuffle,
  Radio,
  Clock,
  Database,
  History,
  ChevronRight,
  User,
  Key,
  Loader2,
} from 'lucide-react'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import { activityLogsService } from '@/lib/api'
import { format } from 'date-fns'

const AUDIT_SECTIONS = [
  { href: '/admin/audit-logs/recent', label: 'Recent Activity', description: 'Live feed from database records', icon: History, color: 'text-red-600 bg-red-50' },
  { href: '/admin/audit-logs/actions', label: 'User Action Logs', description: 'Login, logout, profile changes', icon: Terminal, color: 'text-blue-600 bg-blue-50' },
  { href: '/admin/audit-logs/dispatch', label: 'Dispatch Change Logs', description: 'Assignment board changes', icon: Shuffle, color: 'text-purple-600 bg-purple-50' },
  { href: '/admin/audit-logs/status', label: 'Status Update Logs', description: 'Mission status transitions', icon: Radio, color: 'text-emerald-600 bg-emerald-50' },
  { href: '/admin/audit-logs/handover', label: 'Hospital Handover Logs', description: 'Handover events', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  { href: '/admin/audit-logs/system', label: 'System Logs', description: 'Configuration changes', icon: Database, color: 'text-slate-600 bg-slate-50' },
]

type ActivityLog = {
  id: string
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  user?: {
    username: string
    role: string
    employee?: { firstName?: string | null; lastName?: string | null } | null
  }
}

function actorName(log: ActivityLog) {
  const emp = log.user?.employee
  if (emp?.firstName || emp?.lastName) {
    return [emp.firstName, emp.lastName].filter(Boolean).join(' ')
  }
  return log.user?.username ?? 'System'
}

export default function AccessAuditLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await activityLogsService.getAll({ limit: 50 })
        setLogs(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError('Failed to load activity logs from the database.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Accountability"
        title="Audit Logs"
        subtitle="Operational activity recorded in the database — case updates, assignments, and system events."
        icon={ScrollText}
      />

      <div>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
          Activity Trail
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading activity logs…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500">
            No activity logs recorded yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
            {logs.map((entry) => (
              <div key={entry.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-red-50/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      <span className="text-red-600">{actorName(entry)}</span> — {entry.action}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" />
                      {entry.entityType ?? 'General'}
                      {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ''}
                      {entry.user?.role ? ` · ${entry.user.role}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 shrink-0">
                  {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
          System Audit Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AUDIT_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-red-100 transition-all flex items-start gap-4"
              >
                <div className={`p-3 rounded-xl shrink-0 ${section.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black text-slate-800 group-hover:text-red-600">{section.label}</h3>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-500" />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{section.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
