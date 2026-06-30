'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Building2,
  CheckCheck,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Siren,
  Stethoscope,
  Truck,
  User,
} from 'lucide-react'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'

export type DispatcherAlertCase = {
  id: string
  trackingCode: string
  status: string
  priority?: string
  pickupLocation?: string | null
  destination?: string | null
  updatedAt?: string
  createdAt?: string
  patient?: { fullName?: string | null; phone?: string | null } | null
  driver?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null
  nurse?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null
  ambulance?: { plateNumber?: string | null; ambulanceNumber?: string | null } | null
  region?: { name?: string | null } | null
  destinationHospital?: { name?: string | null } | null
}

export type DispatcherAlertNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  status?: string
  priority?: string
  category?: string
  type?: string
  redirectUrl?: string | null
  emergencyCase?: DispatcherAlertCase | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  REVIEWING: 'Under Review',
  ASSIGNED: 'Assigned',
  DISPATCHED: 'Dispatched',
  EN_ROUTE: 'En Route',
  ARRIVED_SCENE: 'Arrived at Scene',
  PATIENT_STABILIZED: 'On Scene',
  TRANSPORTING: 'Transporting',
  ARRIVED_HOSPITAL: 'Arrived at Hospital',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  REVIEWING: 'bg-amber-100 text-amber-800 border-amber-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  DISPATCHED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  EN_ROUTE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ARRIVED_SCENE: 'bg-purple-100 text-purple-800 border-purple-200',
  PATIENT_STABILIZED: 'bg-purple-100 text-purple-800 border-purple-200',
  TRANSPORTING: 'bg-orange-100 text-orange-800 border-orange-200',
  ARRIVED_HOSPITAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-blue-500 text-white',
}

const MISSION_STEPS = [
  { key: 'assigned', statuses: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] },
  { key: 'scene', statuses: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'] },
  { key: 'transport', statuses: ['TRANSPORTING'] },
  { key: 'hospital', statuses: ['ARRIVED_HOSPITAL', 'COMPLETED'] },
] as const

type FilterTab = 'all' | 'unread' | 'critical' | 'cases'

function personName(person?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!person) return null
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
  return name || null
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null
  const style = PRIORITY_STYLES[priority] ?? 'bg-gray-500 text-white'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${style}`}>
      {priority}
    </span>
  )
}

function missionStepIndex(status: string): number {
  if (status === 'COMPLETED') return MISSION_STEPS.length
  if (status === 'ARRIVED_HOSPITAL') return 3
  if (status === 'TRANSPORTING') return 2
  if (status === 'ARRIVED_SCENE' || status === 'PATIENT_STABILIZED') return 1
  if (status === 'ASSIGNED' || status === 'DISPATCHED' || status === 'EN_ROUTE') return 0
  return -1
}

function MissionProgress({ status }: { status: string }) {
  const completedIndex = missionStepIndex(status)
  const labels = ['Assigned', 'On Scene', 'Transporting', 'Hospital']

  return (
    <div className="mt-3 flex items-center gap-1">
      {MISSION_STEPS.map((step, index) => {
        const done = completedIndex > index
        const active = completedIndex === index
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full ${
                done ? 'bg-emerald-500' : active ? 'animate-pulse bg-red-500' : 'bg-gray-200'
              }`}
            />
            <span
              className={`text-[9px] font-bold uppercase tracking-wide ${
                done || active ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              {labels[index]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CaseTeamRow({ alertCase }: { alertCase: DispatcherAlertCase }) {
  const driver = personName(alertCase.driver)
  const nurse = personName(alertCase.nurse)
  const ambulance =
    alertCase.ambulance?.plateNumber || alertCase.ambulance?.ambulanceNumber || null

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {[
        { icon: User, label: 'Driver', value: driver ?? 'Not assigned' },
        { icon: Stethoscope, label: 'Nurse', value: nurse ?? 'Not assigned' },
        { icon: Truck, label: 'Ambulance', value: ambulance ?? 'Not assigned' },
      ].map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs"
        >
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="font-bold uppercase tracking-wider text-[10px] text-gray-400">{label}</p>
            <p className="truncate font-semibold text-gray-800">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function CaseCard({ alertCase }: { alertCase: DispatcherAlertCase }) {
  const caseHref = `/dispatcher/emergency-requests/${alertCase.id}`
  const destination = alertCase.destinationHospital?.name || alertCase.destination || null

  return (
    <Link
      href={caseHref}
      className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black font-mono text-red-600">{alertCase.trackingCode}</p>
            <PriorityBadge priority={alertCase.priority} />
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {alertCase.patient?.fullName ?? 'Unknown patient'}
          </p>
        </div>
        <StatusBadge status={alertCase.status} />
      </div>

      <MissionProgress status={alertCase.status} />

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {alertCase.region?.name ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-red-400" />
            {alertCase.region.name}
          </span>
        ) : null}
        {alertCase.pickupLocation ? (
          <span className="max-w-full truncate">Pickup: {alertCase.pickupLocation}</span>
        ) : null}
        {destination ? (
          <span className="inline-flex max-w-full items-center gap-1 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-red-400" />
            {destination}
          </span>
        ) : null}
        {alertCase.updatedAt ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated {formatDistanceToNow(new Date(alertCase.updatedAt), { addSuffix: true })}
          </span>
        ) : null}
      </div>

      <CaseTeamRow alertCase={alertCase} />
    </Link>
  )
}

function notificationIcon(item: DispatcherAlertNotification) {
  if (item.priority === 'CRITICAL') return AlertTriangle
  if (item.category === 'HOSPITAL') return Building2
  if (item.category === 'MISSION') return Siren
  return Bell
}

function NotificationCard({
  item,
  onRead,
}: {
  item: DispatcherAlertNotification
  onRead: (id: string) => void
}) {
  const alertCase = item.emergencyCase
  const href =
    item.redirectUrl?.replace(/^\/api/, '') ||
    (alertCase ? `/dispatcher/emergency-requests/${alertCase.id}` : '/dispatcher/alerts/all')
  const Icon = notificationIcon(item)
  const isUnread = item.status === 'UNREAD'

  return (
    <Link
      href={href}
      onClick={() => {
        if (isUnread) onRead(item.id)
      }}
      className={`block rounded-2xl border p-4 transition hover:shadow-md ${
        isUnread ? 'border-red-200 bg-gradient-to-r from-red-50/80 to-white' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
            item.priority === 'CRITICAL' ? 'bg-red-100' : 'bg-gray-50'
          }`}
        >
          <Icon
            className={`h-5 w-5 ${item.priority === 'CRITICAL' ? 'text-red-600' : 'text-red-500'}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-sm text-gray-900">{item.title}</p>
            {isUnread ? (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                New
              </span>
            ) : null}
            <PriorityBadge priority={item.priority} />
            {item.category ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-600">
                {item.category}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.message}</p>
          <p className="mt-1 text-[10px] font-medium text-gray-400">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            {' · '}
            {new Date(item.createdAt).toLocaleString()}
          </p>

          {alertCase ? (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black font-mono text-xs text-red-600">{alertCase.trackingCode}</p>
                <StatusBadge status={alertCase.status} />
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-800">
                {alertCase.patient?.fullName ?? 'Unknown patient'}
                {alertCase.region?.name ? ` · ${alertCase.region.name}` : ''}
              </p>
              <MissionProgress status={alertCase.status} />
              <CaseTeamRow alertCase={alertCase} />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export default function DispatcherCaseAlerts({
  notifications,
  cases,
  region,
  unread: unreadProp,
  onRefresh,
}: {
  notifications: DispatcherAlertNotification[]
  cases: DispatcherAlertCase[]
  region?: string | null
  unread?: number
  onRefresh?: () => void
}) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount =
    unreadProp ?? notifications.filter((n) => n.status === 'UNREAD' && !readIds.has(n.id)).length
  const criticalCount = notifications.filter((n) => n.priority === 'CRITICAL').length

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const unread = n.status === 'UNREAD' && !readIds.has(n.id)
      if (filter === 'unread') return unread
      if (filter === 'critical') return n.priority === 'CRITICAL'
      if (filter === 'cases') return false
      return true
    })
  }, [filter, notifications, readIds])

  const handleRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id))
    void dispatcherDashboardApi.markNotificationRead(id).catch(() => {})
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await dispatcherDashboardApi.markAllNotificationsRead()
      setReadIds(new Set(notifications.map((n) => n.id)))
      onRefresh?.()
    } finally {
      setMarkingAll(false)
    }
  }

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All Alerts', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'critical', label: 'Critical', count: criticalCount },
    { id: 'cases', label: 'Live Cases', count: cases.length },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Alerts', value: notifications.length, icon: Bell, tone: 'text-red-600 bg-red-50' },
          { label: 'Unread', value: unreadCount, icon: BellOff, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Critical', value: criticalCount, icon: AlertTriangle, tone: 'text-red-700 bg-red-100' },
          { label: 'Live Cases', value: cases.length, icon: Siren, tone: 'text-indigo-600 bg-indigo-50' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.tone}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                filter === tab.id
                  ? 'bg-red-600 text-white shadow-md shadow-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === tab.id ? 'bg-white/20' : 'bg-white text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={markingAll}
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase text-gray-700 transition hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {region ? (
        <p className="text-sm text-gray-600">
          Region: <span className="font-bold text-gray-900">{region}</span>
        </p>
      ) : null}

      {filter === 'cases' ? (
        cases.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {cases.map((c) => (
              <CaseCard key={c.id} alertCase={c} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No active cases in your region.
          </p>
        )
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <NotificationCard key={n.id} item={n} onRead={handleRead} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          {filter === 'unread'
            ? 'No unread notifications.'
            : filter === 'critical'
              ? 'No critical alerts right now.'
              : 'No notifications yet.'}
        </p>
      )}

      {filter !== 'cases' && cases.length > 0 ? (
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
            Live Regional Cases ({cases.length})
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {cases.slice(0, 4).map((c) => (
              <CaseCard key={c.id} alertCase={c} />
            ))}
          </div>
          {cases.length > 4 ? (
            <button
              type="button"
              onClick={() => setFilter('cases')}
              className="text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-700"
            >
              View all {cases.length} cases →
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
