'use client'

import { useState, useRef, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Search,
  RefreshCw,
  Activity,
  AlertTriangle,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { activityLogsService } from '@/lib/api'
import {
  ACTIVITY_FILTER_TABS,
  type ActivityFilterTab,
  type OperationalActivityFeed,
  formatTimeAgo,
  getActivityVisual,
} from '@/lib/dashboard/operationalActivities'

interface RecentActivitiesWidgetProps {
  variant?: 'widget' | 'page'
  className?: string
  hideSummary?: boolean
  hideViewAll?: boolean
  bare?: boolean
}

const fetchOperational = async (
  category: string | undefined,
  search: string,
  limit: number,
): Promise<OperationalActivityFeed> => {
  const data = await activityLogsService.getOperational({
    limit,
    category: category && category !== 'all' ? category : undefined,
    search: search.trim() || undefined,
  })
  return data ?? { summary: { todayCount: 0, criticalCount: 0, pendingCount: 0 }, activities: [] }
}

export function RecentActivitiesWidget({
  variant = 'widget',
  className = '',
  hideSummary = false,
  hideViewAll = false,
  bare = false,
}: RecentActivitiesWidgetProps) {
  const [filter, setFilter] = useState<ActivityFilterTab>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const limit = variant === 'page' ? 50 : bare ? 20 : 12
  const apiCategory = ACTIVITY_FILTER_TABS.find((t) => t.id === filter)?.apiCategory

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 350)
  }, [])

  const { data, isLoading, isValidating, mutate } = useSWR(
    ['operational-activities', apiCategory, debouncedSearch, limit],
    () => fetchOperational(apiCategory, debouncedSearch, limit),
    { refreshInterval: 15000, revalidateOnFocus: true },
  )

  const summary = data?.summary ?? { todayCount: 0, criticalCount: 0, pendingCount: 0 }
  const activities = data?.activities ?? []

  const isWidget = variant === 'widget'

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        bare ? 'h-full min-h-0' : `bg-white rounded-2xl border border-slate-100 shadow-sm ${isWidget ? 'h-[640px]' : 'min-h-[480px]'}`
      } ${className}`}
    >
      <div className={`${bare ? 'pb-2' : 'px-4 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50'}`}>
        {!bare && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Recent Activities
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </span>
            <button
              type="button"
              onClick={() => mutate()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        )}
        {bare && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {!hideSummary && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <SummaryPill label="Today's Activities" value={summary.todayCount} tone="blue" />
            <SummaryPill label="Critical Activities" value={summary.criticalCount} tone="red" />
            <SummaryPill label="Pending Actions" value={summary.pendingCount} tone="amber" />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search case ID, patient, hospital, driver, nurse…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline feed */}
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium">Loading activities…</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Clock className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No activities found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting filters or search</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-100" aria-hidden />
            <ul className="space-y-1">
              {activities.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      {isWidget && !hideViewAll && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <Link
            href="/admin/dashboard#recent-activities"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
          >
            View All Activities
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'red' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide mt-1 opacity-80 leading-tight">{label}</p>
    </div>
  )
}

function ActivityRow({ item }: { item: import('@/lib/dashboard/operationalActivities').OperationalActivityItem }) {
  const visual = getActivityVisual(item.kind, item.category)
  const timeAgo = formatTimeAgo(item.createdAt)
  const isCritical = item.priority === 'CRITICAL' || item.kind === 'CRITICAL_ALERT'

  return (
    <li>
      <Link
        href={item.href}
        className="group flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors relative"
      >
        <div
          className={`relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${visual.bg} ${visual.border}`}
        >
          {visual.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-sm font-bold text-slate-900 ${visual.text}`}>{item.title}</h4>
                {isCritical && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                    <AlertTriangle className="w-3 h-3" />
                    Critical
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{item.description}</p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-slate-400 whitespace-nowrap">{timeAgo}</span>
          </div>

          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-slate-700 truncate">{item.actorName}</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide shrink-0">
                {item.actorRole}
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.actionLabel}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}
