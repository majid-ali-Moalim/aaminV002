'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Shield,
  Search,
  Loader2,
  Inbox,
  Clock,
  Infinity as InfinityIcon,
  Trash2,
  Power,
  PowerOff,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import { Button } from '@/components/ui/button'
import { accessControlService, getApiErrorMessage } from '@/lib/api'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

type GrantRecord = {
  id: string
  permissionKey: string
  grantedAt: string
  expiresAt: string | null
  isUnlimited: boolean
  isActive: boolean
  isTimeExpired: boolean
  isEffective: boolean
  status: 'active' | 'inactive' | 'expired'
  user: {
    id: string
    username: string
    email: string
    role: string
    displayName: string
    employeeRole: string | null
    department: string | null
  }
}

type DurationFilter = 'all' | 'permanent' | 'temporary'
type StatusFilter = 'all' | 'active' | 'inactive' | 'expired'

export default function AccessManagementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [records, setRecords] = useState<GrantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  const loadGrants = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await accessControlService.listAllGrants({
        search: searchTerm.trim() || undefined,
        duration: durationFilter,
        status: statusFilter,
      })
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(getApiErrorMessage(err, 'Failed to load granted permissions.'))
    } finally {
      setLoading(false)
    }
  }, [searchTerm, durationFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(loadGrants, searchTerm ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadGrants, searchTerm])

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    inactive: records.filter((r) => r.status === 'inactive').length,
    expired: records.filter((r) => r.status === 'expired').length,
    permanent: records.filter((r) => r.isUnlimited).length,
    temporary: records.filter((r) => !r.isUnlimited).length,
  }), [records])

  const handleActivate = async (grant: GrantRecord) => {
    try {
      setActionId(grant.id)
      await accessControlService.activateGrant(grant.id)
      toast.success(`Activated ${getPermissionLabel(grant.permissionKey)} for ${grant.user.displayName}`)
      await loadGrants()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to activate permission')
    } finally {
      setActionId(null)
    }
  }

  const handleDeactivate = async (grant: GrantRecord) => {
    try {
      setActionId(grant.id)
      await accessControlService.deactivateGrant(grant.id)
      toast.success(`Deactivated ${getPermissionLabel(grant.permissionKey)} for ${grant.user.displayName}`)
      await loadGrants()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate permission')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (grant: GrantRecord) => {
    const label = getPermissionLabel(grant.permissionKey)
    if (!window.confirm(`Delete "${label}" for ${grant.user.displayName}? This cannot be undone.`)) return
    try {
      setActionId(grant.id)
      await accessControlService.deleteGrant(grant.id)
      toast.success(`Deleted ${label} for ${grant.user.displayName}`)
      await loadGrants()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete permission')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Granted Permissions"
        title="Access Management"
        subtitle="View, search, and manage all permissions granted to staff — activate, deactivate, or remove access."
        icon={Shield}
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total grants', value: stats.total },
          { label: 'Active', value: stats.active, accent: 'text-emerald-600' },
          { label: 'Inactive', value: stats.inactive, accent: 'text-amber-600' },
          { label: 'Expired', value: stats.expired, accent: 'text-slate-500' },
          { label: 'Permanent', value: stats.permanent, accent: 'text-blue-600' },
          { label: 'Temporary', value: stats.temporary, accent: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={cn('text-2xl font-black mt-1', s.accent ?? 'text-slate-800')}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user, email, permission, or role…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
            <span className="px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Duration
            </span>
            {(['all', 'permanent', 'temporary'] as DurationFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDurationFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold capitalize',
                  durationFilter === f ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500',
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
            <span className="px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500">Status</span>
            {(['all', 'active', 'inactive', 'expired'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold capitalize',
                  statusFilter === f ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading granted permissions…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-bold text-slate-700">No granted permissions found</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {searchTerm || durationFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Grant permissions from the Permissions page — they will appear here for management.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Permission</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Granted</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Expiration</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((grant) => {
                  const busy = actionId === grant.id
                  const permLabel = getPermissionLabel(grant.permissionKey)
                  return (
                    <tr key={grant.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{grant.user.displayName}</p>
                        <p className="text-xs text-slate-500">{grant.user.email}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {grant.user.role}
                          {grant.user.employeeRole ? ` · ${grant.user.employeeRole}` : ''}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{permLabel}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{grant.permissionKey}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {format(new Date(grant.grantedAt), 'MMM d, yyyy')}
                        <p className="text-[10px] text-slate-400">
                          {format(new Date(grant.grantedAt), 'HH:mm')}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {grant.isUnlimited ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                            <InfinityIcon className="w-3.5 h-3.5" /> Permanent
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(grant.expiresAt!), 'MMM d, yyyy HH:mm')}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {grant.isTimeExpired
                                ? 'Expired'
                                : formatDistanceToNow(new Date(grant.expiresAt!), { addSuffix: true })}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={grant.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {grant.status !== 'active' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg h-8 text-xs"
                              disabled={busy}
                              onClick={() => handleActivate(grant)}
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5 mr-1" />}
                              Activate
                            </Button>
                          )}
                          {grant.status === 'active' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                              disabled={busy}
                              onClick={() => handleDeactivate(grant)}
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PowerOff className="w-3.5 h-3.5 mr-1" />}
                              Deactivate
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-8 text-xs border-red-200 text-red-700 hover:bg-red-50"
                            disabled={busy}
                            onClick={() => handleDelete(grant)}
                          >
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-900 text-slate-300 px-5 py-4 flex items-start gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-white">Deactivate</strong> suspends access without removing the grant record.
          <strong className="text-white"> Delete</strong> permanently removes the permission.
          Users must sign in again for changes to take effect.
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: GrantRecord['status'] }) {
  const styles = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-amber-100 text-amber-800',
    expired: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-full', styles[status])}>
      {status}
    </span>
  )
}
