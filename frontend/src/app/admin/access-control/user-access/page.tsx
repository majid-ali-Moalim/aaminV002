'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ComponentType } from 'react'
import {
  Users,
  Search,
  Shield,
  Loader2,
  Mail,
  Building2,
  UserCircle,
  Check,
  Sparkles,
  AlertTriangle,
  Save,
  ChevronDown,
  ChevronRight,
  Ban,
  Clock,
  Infinity as InfinityIcon,
  Filter,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import GrantAccessConfirmModal from '@/components/features/access-control/GrantAccessConfirmModal'
import { usersService, accessControlService } from '@/lib/api'
import {
  ASSIGNABLE_PERMISSION_CATALOG,
  ALL_PERMISSIONS,
  getStaffProfileLabel,
  getSuggestedPermissionsForUser,
  resolveStaffProfile,
} from '@/lib/accessControlCatalog'
import { addDays, addHours, format, formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

type DbUser = {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
  employee?: {
    firstName?: string | null
    lastName?: string | null
    status?: string
    shiftStatus?: string
    employeeRole?: { id: string; name: string } | null
    department?: { id: string; name: string } | null
  } | null
}

type PermissionGrant = {
  permissionKey: string
  grantedAt: string
  expiresAt: string | null
  isUnlimited: boolean
  isExpired: boolean
}

type DurationPreset = '1h' | '24h' | '7d' | '30d' | 'custom'
type PermFilter = 'all' | 'suggested' | 'selected'

const DURATION_PRESETS: { id: DurationPreset; label: string }[] = [
  { id: '1h', label: '1 hour' },
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
]

function displayName(user: DbUser) {
  if (user.employee?.firstName || user.employee?.lastName) {
    return [user.employee.firstName, user.employee.lastName].filter(Boolean).join(' ')
  }
  return user.username
}

function computeExpiresAt(
  mode: 'unlimited' | 'limited',
  preset: DurationPreset,
  customExpiry: string,
): Date | null {
  if (mode === 'unlimited') return null
  const now = new Date()
  switch (preset) {
    case '1h':
      return addHours(now, 1)
    case '24h':
      return addHours(now, 24)
    case '7d':
      return addDays(now, 7)
    case '30d':
      return addDays(now, 30)
    case 'custom':
      return customExpiry ? new Date(customExpiry) : null
    default:
      return null
  }
}

export default function UserAccessPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<DbUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [suggestedKeys, setSuggestedKeys] = useState<Set<string>>(new Set())
  const [savedGrants, setSavedGrants] = useState<PermissionGrant[]>([])
  const [permLoading, setPermLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(['drivers', 'dispatchers', 'emergency']),
  )
  const [dirty, setDirty] = useState(false)
  const [permSearch, setPermSearch] = useState('')
  const [permFilter, setPermFilter] = useState<PermFilter>('all')
  const [accessMode, setAccessMode] = useState<'unlimited' | 'limited'>('unlimited')
  const [durationPreset, setDurationPreset] = useState<DurationPreset>('7d')
  const [customExpiry, setCustomExpiry] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await usersService.getAll()
        const list = (Array.isArray(data) ? data : []).filter((u: DbUser) => u.role !== 'PATIENT')
        setUsers(list)
        if (list.length > 0) setSelectedId(list[0].id)
      } catch (err) {
        console.error(err)
        setError('Failed to load users from the database.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const name = displayName(u).toLowerCase()
        const q = searchTerm.toLowerCase()
        return (
          name.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          (u.employee?.employeeRole?.name ?? '').toLowerCase().includes(q)
        )
      }),
    [users, searchTerm],
  )

  const selected = filtered.find((u) => u.id === selectedId) ?? filtered[0]
  const isAdminUser = selected?.role === 'ADMIN'

  const loadPermissions = useCallback(async (userId: string) => {
    try {
      setPermLoading(true)
      const data = await accessControlService.getUserPermissions(userId)
      const active = data.grantedPermissions.filter((g) => !g.isExpired)
      setSelectedKeys(new Set(active.map((g) => g.permissionKey)))
      setSavedGrants(data.grantedPermissions)
      setSuggestedKeys(new Set(data.suggestedPermissions))
      setDirty(false)
      setConfirmOpen(false)

      const hasLimited = active.some((g) => g.expiresAt)
      if (hasLimited && active[0]?.expiresAt) {
        setAccessMode('limited')
        setCustomExpiry(active[0].expiresAt.slice(0, 16))
        setDurationPreset('custom')
      } else {
        setAccessMode('unlimited')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load permissions for this user')
    } finally {
      setPermLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected?.id) loadPermissions(selected.id)
  }, [selected?.id, loadPermissions])

  const profile = selected
    ? resolveStaffProfile(selected.role, selected.employee?.employeeRole?.name)
    : null

  const expiresAt = useMemo(
    () => computeExpiresAt(accessMode, durationPreset, customExpiry),
    [accessMode, durationPreset, customExpiry],
  )

  const selectedKeyList = useMemo(() => [...selectedKeys], [selectedKeys])

  const sensitiveSelectedCount = useMemo(
    () => selectedKeyList.filter((k) => ALL_PERMISSIONS.find((p) => p.key === k)?.sensitive).length,
    [selectedKeyList],
  )

  const activeSavedCount = savedGrants.filter((g) => !g.isExpired).length

  const togglePermission = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setDirty(true)
  }

  const applySuggested = () => {
    if (!selected) return
    const suggested = getSuggestedPermissionsForUser(
      selected.role,
      selected.employee?.employeeRole?.name,
    )
    setSelectedKeys(new Set(suggested))
    setDirty(true)
    toast.success(`Applied suggested permissions for ${getStaffProfileLabel(profile)}`)
  }

  const openConfirm = () => {
    if (accessMode === 'limited') {
      if (!expiresAt || expiresAt <= new Date()) {
        toast.error('Choose a valid future expiry date and time')
        return
      }
    }
    if (selectedKeys.size === 0) {
      toast.error('Select at least one permission to grant')
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmGrant = async () => {
    if (!selected) return
    try {
      setSaving(true)
      await accessControlService.setUserPermissions(selected.id, {
        permissions: selectedKeyList,
        expiresAt: accessMode === 'unlimited' ? null : expiresAt?.toISOString() ?? null,
      })
      setDirty(false)
      setConfirmOpen(false)
      await loadPermissions(selected.id)
      toast.success(`Access granted to ${displayName(selected)}. They must sign in again.`)
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const visibleCatalog = useMemo(() => {
    const q = permSearch.toLowerCase()
    return ASSIGNABLE_PERMISSION_CATALOG.map((cat) => ({
      ...cat,
      permissions: cat.permissions.filter((p) => {
        const matchesSearch =
          !q ||
          p.label.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        const matchesFilter =
          permFilter === 'all' ||
          (permFilter === 'suggested' && suggestedKeys.has(p.key)) ||
          (permFilter === 'selected' && selectedKeys.has(p.key))
        return matchesSearch && matchesFilter
      }),
    })).filter((cat) => cat.permissions.length > 0)
  }, [permSearch, permFilter, suggestedKeys, selectedKeys])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Grant Access"
        title="User Access"
        subtitle="Assign time-limited or unlimited permissions to staff. Patient accounts are excluded."
        icon={Users}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading staff accounts…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500">
          No staff accounts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* User list */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">{filtered.length} staff account(s)</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden max-h-[680px] overflow-y-auto">
              {filtered.map((u) => {
                const p = resolveStaffProfile(u.role, u.employee?.employeeRole?.name)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors',
                      selected?.id === u.id
                        ? 'bg-red-50 border-l-4 border-l-red-600'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <p className="font-bold text-slate-800">{displayName(u)}</p>
                    <p className="text-xs text-slate-500">
                      {getStaffProfileLabel(p)}
                      {u.employee?.employeeRole ? ` · ${u.employee.employeeRole.name}` : ''}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {selected && (
            <div className="xl:col-span-9 space-y-4">
              {/* User header + stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{displayName(selected)}</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Mail className="w-3.5 h-3.5" /> {selected.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-full bg-blue-100 text-blue-800">
                      <Shield className="w-3.5 h-3.5" />
                      {getStaffProfileLabel(profile)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                  <StatCard icon={KeyRound} label="Selected" value={String(selectedKeys.size)} accent="text-red-600" />
                  <StatCard icon={Sparkles} label="Suggested" value={String(suggestedKeys.size)} accent="text-emerald-600" />
                  <StatCard icon={Shield} label="Active grants" value={String(activeSavedCount)} accent="text-blue-600" />
                  <StatCard
                    icon={AlertTriangle}
                    label="Sensitive"
                    value={String(sensitiveSelectedCount)}
                    accent={sensitiveSelectedCount > 0 ? 'text-amber-600' : 'text-slate-400'}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <InfoRow icon={UserCircle} label="System role" value={selected.role} />
                  <InfoRow icon={Building2} label="Department" value={selected.employee?.department?.name ?? '—'} />
                  <InfoRow icon={Users} label="Status" value={selected.employee?.status ?? '—'} />
                  <InfoRow icon={Shield} label="Member since" value={format(new Date(selected.createdAt), 'MMM yyyy')} />
                </div>
              </div>

              {/* Access duration */}
              {!isAdminUser && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    Access duration
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Choose whether permissions expire or remain until revoked.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <DurationToggle
                      active={accessMode === 'unlimited'}
                      onClick={() => { setAccessMode('unlimited'); setDirty(true) }}
                      icon={InfinityIcon}
                      label="Unlimited"
                      description="No expiry"
                    />
                    <DurationToggle
                      active={accessMode === 'limited'}
                      onClick={() => { setAccessMode('limited'); setDirty(true) }}
                      icon={Clock}
                      label="Time-limited"
                      description="Auto-revoke"
                    />
                  </div>
                  {accessMode === 'limited' && (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-2">
                        {DURATION_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setDurationPreset(p.id); setDirty(true) }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                              durationPreset === p.id
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {durationPreset === 'custom' && (
                        <input
                          type="datetime-local"
                          value={customExpiry}
                          min={new Date().toISOString().slice(0, 16)}
                          onChange={(e) => { setCustomExpiry(e.target.value); setDirty(true) }}
                          className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      )}
                      {expiresAt && expiresAt > new Date() && (
                        <p className="text-xs text-blue-700 font-semibold">
                          Access expires {format(expiresAt, 'PPP p')} ({formatDistanceToNow(expiresAt, { addSuffix: true })})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Permissions panel */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-red-50/30">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900">Permissions & Privileges</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select actions for {getStaffProfileLabel(profile)} — suggested items are highlighted.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                        onClick={applySuggested}
                        disabled={permLoading || isAdminUser}
                      >
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Apply suggested
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl bg-red-600 hover:bg-red-700"
                        onClick={openConfirm}
                        disabled={permLoading || !dirty || isAdminUser || selectedKeys.size === 0}
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        Review & grant
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter permissions…"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                      {(['all', 'suggested', 'selected'] as PermFilter[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setPermFilter(f)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold capitalize flex items-center gap-1',
                            permFilter === f ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500',
                          )}
                        >
                          {f === 'all' && <Filter className="w-3 h-3" />}
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isAdminUser && (
                  <div className="mx-4 mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
                    Administrators have full system access automatically.
                  </div>
                )}

                {permLoading ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading permissions…
                  </div>
                ) : (
                  <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
                    {visibleCatalog.length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-8">No permissions match your filter.</p>
                    ) : (
                      visibleCatalog.map((cat) => {
                        const Icon = cat.icon
                        const expanded = expandedCats.has(cat.id)
                        const catSelected = cat.permissions.filter((p) => selectedKeys.has(p.key)).length
                        return (
                          <div key={cat.id} className="rounded-xl border border-slate-100 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
                            >
                              {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                              <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-sm text-slate-800 flex-1">{cat.category}</span>
                              <span className="text-xs font-bold text-slate-400">{catSelected}/{cat.permissions.length}</span>
                            </button>
                            {expanded && (
                              <div className="divide-y divide-slate-50">
                                {cat.permissions.map((perm) => {
                                  const checked = selectedKeys.has(perm.key)
                                  const isSuggested = suggestedKeys.has(perm.key)
                                  const saved = savedGrants.find((g) => g.permissionKey === perm.key && !g.isExpired)
                                  return (
                                    <label
                                      key={perm.key}
                                      className={cn(
                                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                                        checked ? 'bg-red-50/40' : 'hover:bg-slate-50',
                                      )}
                                    >
                                      <div className="pt-0.5">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePermission(perm.key)}
                                          disabled={isAdminUser}
                                          className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-semibold text-slate-800">{perm.label}</span>
                                          {isSuggested && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Suggested</span>
                                          )}
                                          {perm.sensitive && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-0.5">
                                              <AlertTriangle className="w-3 h-3" /> Sensitive
                                            </span>
                                          )}
                                          {saved && !dirty && (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                              {saved.isUnlimited ? 'Active · Unlimited' : `Active · until ${format(new Date(saved.expiresAt!), 'MMM d')}`}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                                      </div>
                                      {checked && <Check className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{selectedKeys.size} permission(s) selected</span>
                  <span className="flex items-center gap-1">
                    {accessMode === 'unlimited' ? (
                      <><InfinityIcon className="w-3.5 h-3.5" /> Unlimited duration</>
                    ) : (
                      <><Clock className="w-3.5 h-3.5" /> Time-limited</>
                    )}
                  </span>
                  {dirty && <span className="text-amber-600 font-semibold">Unsaved changes</span>}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 text-slate-300 px-5 py-4 flex items-start gap-3 text-sm">
                <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Patient accounts</strong> cannot receive operational permissions.
                  Staff grants require confirmation and can be unlimited or time-limited.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <GrantAccessConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmGrant}
          confirming={saving}
          userName={displayName(selected)}
          userEmail={selected.email}
          permissionKeys={selectedKeyList}
          sensitiveCount={sensitiveSelectedCount}
          accessMode={accessMode}
          expiresAt={expiresAt}
        />
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{value}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-2xl font-black mt-1', accent)}>{value}</p>
    </div>
  )
}

function DurationToggle({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: ComponentType<{ className?: string }>
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[140px]',
        active ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <Icon className={cn('w-5 h-5', active ? 'text-red-600' : 'text-slate-400')} />
      <div>
        <p className={cn('text-sm font-bold', active ? 'text-red-800' : 'text-slate-700')}>{label}</p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>
    </button>
  )
}
