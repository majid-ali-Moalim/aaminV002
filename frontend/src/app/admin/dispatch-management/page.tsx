'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService, notificationsService } from '@/lib/api'
import { EmergencyRequest, EmergencyRequestStatus } from '@/types'
import {
  Search,
  Eye,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Activity,
  Gauge,
  RefreshCw,
  MessageSquare,
  Loader2,
  X,
  Send,
  Radio,
  User,
  HeartPulse,
  ArrowRight,
} from 'lucide-react'

const ACTIVE_STATUSES: EmergencyRequestStatus[] = [
  EmergencyRequestStatus.ASSIGNED,
  EmergencyRequestStatus.DISPATCHED,
  EmergencyRequestStatus.ARRIVED_SCENE,
  EmergencyRequestStatus.TRANSPORTING,
  EmergencyRequestStatus.ARRIVED_HOSPITAL,
]

const STATUS_CHIPS: { id: string; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'ARRIVED_SCENE', label: 'On Scene' },
  { id: 'TRANSPORTING', label: 'Transporting' },
  { id: 'ARRIVED_HOSPITAL', label: 'At Hospital' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

const PRIORITY_WEIGHT: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const statusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
    case 'ASSIGNED':
    case 'DISPATCHED':
      return { pill: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
    case 'ARRIVED_SCENE':
    case 'TRANSPORTING':
    case 'ARRIVED_HOSPITAL':
      return { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    case 'COMPLETED':
      return { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
    case 'CANCELLED':
      return { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
    default:
      return { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
  }
}

const priorityStyle = (priority: string) => {
  switch (priority) {
    case 'CRITICAL':
      return { pill: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
    case 'HIGH':
      return { pill: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' }
    case 'MEDIUM':
      return { pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' }
    case 'LOW':
      return { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' }
    default:
      return { pill: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300' }
  }
}

const fmtStatus = (status: string) => status.replace(/_/g, ' ')

const fmtTime = (value?: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const fullName = (person?: { firstName?: string | null; lastName?: string | null } | null) => {
  if (!person) return null
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return name || null
}

export default function DispatchManagementPage() {
  const [dispatches, setDispatches] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [selectedDispatch, setSelectedDispatch] = useState<EmergencyRequest | null>(null)

  const [chatTarget, setChatTarget] = useState<EmergencyRequest | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      const data = (await emergencyRequestsService.getAll()) as EmergencyRequest[]
      setDispatches(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load dispatches:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(false), 15000)
    return () => clearInterval(interval)
  }, [load])

  const stats = useMemo(() => {
    const active = dispatches.filter((d) => ACTIVE_STATUSES.includes(d.status)).length
    const pending = dispatches.filter((d) => d.status === EmergencyRequestStatus.PENDING).length
    const criticalActive = dispatches.filter(
      (d) => ACTIVE_STATUSES.includes(d.status) && d.priority === 'CRITICAL',
    ).length
    const today = new Date().toDateString()
    const completedToday = dispatches.filter(
      (d) =>
        d.status === EmergencyRequestStatus.COMPLETED &&
        d.completedAt &&
        new Date(d.completedAt).toDateString() === today,
    ).length
    const responseValues = dispatches
      .map((d) => d.responseMinutes)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const avgResponse = responseValues.length
      ? Math.round(responseValues.reduce((a, b) => a + b, 0) / responseValues.length)
      : null
    return { active, pending, criticalActive, completedToday, avgResponse }
  }, [dispatches])

  const filteredDispatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const rows = dispatches.filter((d) => {
      const matchesStatus = statusFilter === '' || d.status === statusFilter
      const matchesPriority = priorityFilter === '' || d.priority === priorityFilter
      if (!matchesStatus || !matchesPriority) return false
      if (!q) return true
      const hay = [
        d.trackingCode,
        d.patient?.fullName ?? '',
        d.callerName ?? '',
        d.callerPhone ?? '',
        d.patient?.phone ?? '',
        d.ambulance?.ambulanceNumber ?? '',
        d.pickupLocation ?? '',
        fullName(d.dispatcher) ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })

    const bucket = (s: EmergencyRequestStatus) =>
      s === EmergencyRequestStatus.PENDING ? 0 : ACTIVE_STATUSES.includes(s) ? 1 : 2

    return rows.sort((a, b) => {
      const bk = bucket(a.status) - bucket(b.status)
      if (bk !== 0) return bk
      const pw = (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9)
      if (pw !== 0) return pw
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [dispatches, searchTerm, statusFilter, priorityFilter])

  const openChat = (dispatch: EmergencyRequest) => {
    setChatTarget(dispatch)
    setChatMessage('')
    setSentOk(false)
    setSendError(null)
  }

  const sendMessage = async () => {
    if (!chatTarget?.dispatcherId || !chatMessage.trim()) return
    try {
      setSending(true)
      setSendError(null)
      await notificationsService.sendDirect({
        employeeId: chatTarget.dispatcherId,
        title: `Message about case ${chatTarget.trackingCode}`,
        message: chatMessage.trim(),
        priority: chatTarget.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        entityType: 'EmergencyRequest',
        entityId: chatTarget.id,
        redirectUrl: `/dispatcher/emergency/active?id=${chatTarget.id}`,
      })
      setSentOk(true)
      setChatMessage('')
    } catch (err: any) {
      setSendError(err?.response?.data?.message || err?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-900 p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-10 opacity-10">
          <Radio className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">Live</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Live Dispatch Board</h1>
            <p className="text-slate-300 mt-2 text-sm max-w-xl">
              Real-time command view of every active case, crew and ambulance across the network.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last updated</p>
              <p className="text-sm font-bold text-white">{lastUpdated ? fmtTime(lastUpdated.toISOString()) : '—'}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => load(false)}
              disabled={refreshing}
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Dispatches" value={stats.active} sub={`${stats.criticalActive} critical`} tone="emerald" icon={Activity} />
        <KpiCard label="Pending Assignment" value={stats.pending} sub="Awaiting crew" tone="amber" icon={Clock} />
        <KpiCard label="Avg Response" value={stats.avgResponse != null ? `${stats.avgResponse}m` : '—'} sub="All cases" tone="blue" icon={Gauge} />
        <KpiCard label="Completed Today" value={stats.completedToday} sub="Handover done" tone="violet" icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tracking code, patient, phone, ambulance, dispatcher…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="">All Priority</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.id || 'all'}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === chip.id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800">Dispatch Queue</h2>
          <span className="text-xs text-slate-500">{filteredDispatches.length} of {dispatches.length} shown</span>
        </div>
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-red-500" />
            <span className="text-sm font-medium">Loading live dispatches…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Case</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Crew & Unit</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Timing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      No dispatches match your filters
                    </td>
                  </tr>
                ) : (
                  filteredDispatches.map((dispatch) => {
                    const driverName = fullName(dispatch.driver)
                    const nurseName = fullName(dispatch.nurse)
                    const dispatcherName = fullName(dispatch.dispatcher)
                    const st = statusStyle(dispatch.status)
                    const pr = priorityStyle(dispatch.priority)
                    return (
                      <tr key={dispatch.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 w-1 h-10 rounded-full ${pr.bar}`} />
                            <div>
                              <div className="font-bold text-slate-900">{dispatch.trackingCode}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{dispatch.incidentCategory?.name ?? 'Emergency'}</div>
                              <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${pr.pill}`}>
                                {dispatch.priority}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{dispatch.patient?.fullName ?? dispatch.callerName ?? '—'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{dispatch.patient?.phone ?? dispatch.callerPhone ?? '—'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {fmtStatus(dispatch.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {dispatch.ambulance || driverName || nurseName ? (
                            <div className="space-y-1">
                              {dispatch.ambulance && (
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                  <Truck className="w-3.5 h-3.5 text-slate-400" /> {dispatch.ambulance.ambulanceNumber}
                                </div>
                              )}
                              {driverName && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <User className="w-3 h-3" /> {driverName}
                                </div>
                              )}
                              {nurseName && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <HeartPulse className="w-3 h-3" /> {nurseName}
                                </div>
                              )}
                              {dispatcherName && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Radio className="w-3 h-3" /> {dispatcherName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Not assigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="max-w-[190px] truncate">{dispatch.pickupLocation}</span>
                          </div>
                          {dispatch.destination && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <ArrowRight className="w-3 h-3" /> <span className="max-w-[190px] truncate">{dispatch.destination}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-500">Created {fmtTime(dispatch.createdAt)}</div>
                          {dispatch.assignedAt && <div className="text-xs text-slate-500">Assigned {fmtTime(dispatch.assignedAt)}</div>}
                          {dispatch.responseMinutes != null && (
                            <div className="text-xs text-emerald-600 font-semibold mt-0.5">{dispatch.responseMinutes} min response</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDispatch(dispatch)}
                              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openChat(dispatch)}
                              disabled={!dispatch.dispatcherId}
                              title={dispatch.dispatcherId ? 'Chat with dispatcher' : 'No dispatcher assigned'}
                              className="p-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedDispatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-10 rounded-full ${priorityStyle(selectedDispatch.priority).bar}`} />
                <div>
                  <h2 className="text-xl font-black text-slate-900">Dispatch Details</h2>
                  <p className="text-sm text-slate-500">{selectedDispatch.trackingCode}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDispatch(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-7 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailBlock title="Case Information">
                <DetailRow label="Status">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusStyle(selectedDispatch.status).pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle(selectedDispatch.status).dot}`} />
                    {fmtStatus(selectedDispatch.status)}
                  </span>
                </DetailRow>
                <DetailRow label="Priority">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${priorityStyle(selectedDispatch.priority).pill}`}>
                    {selectedDispatch.priority}
                  </span>
                </DetailRow>
                <DetailRow label="Type" value={selectedDispatch.incidentCategory?.name ?? 'Emergency'} />
                <DetailRow label="Source" value={selectedDispatch.requestSource} />
              </DetailBlock>

              <DetailBlock title="Patient">
                <DetailRow label="Name" value={selectedDispatch.patient?.fullName ?? selectedDispatch.callerName ?? '—'} />
                <DetailRow label="Phone" value={selectedDispatch.patient?.phone ?? selectedDispatch.callerPhone ?? '—'} />
                <DetailRow label="Condition" value={selectedDispatch.patientCondition ?? '—'} />
                <DetailRow label="Symptoms" value={selectedDispatch.symptoms ?? '—'} />
              </DetailBlock>

              <DetailBlock title="Assigned Team">
                <DetailRow label="Ambulance" value={selectedDispatch.ambulance?.ambulanceNumber ?? 'Not assigned'} />
                <DetailRow label="Driver" value={fullName(selectedDispatch.driver) ?? 'Not assigned'} />
                <DetailRow label="Nurse" value={fullName(selectedDispatch.nurse) ?? 'Not assigned'} />
                <DetailRow label="Dispatcher" value={fullName(selectedDispatch.dispatcher) ?? 'Not assigned'} />
              </DetailBlock>

              <DetailBlock title="Location & Timing">
                <DetailRow label="Pickup" value={selectedDispatch.pickupLocation} />
                <DetailRow label="Destination" value={selectedDispatch.destination ?? '—'} />
                <DetailRow label="Created" value={fmtTime(selectedDispatch.createdAt)} />
                <DetailRow label="Assigned" value={fmtTime(selectedDispatch.assignedAt)} />
              </DetailBlock>
            </div>

            <div className="px-7 py-5 border-t border-slate-100 flex flex-wrap gap-3">
              <Link href={`/admin/emergency-requests/${selectedDispatch.id}`}>
                <Button className="bg-red-600 hover:bg-red-700 rounded-xl">Open Full Case</Button>
              </Link>
              {selectedDispatch.dispatcherId && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const target = selectedDispatch
                    setSelectedDispatch(null)
                    openChat(target)
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Message Dispatcher
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat with Dispatcher Modal */}
      {chatTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Message Dispatcher</h2>
                  <p className="text-xs text-blue-100">
                    {fullName(chatTarget.dispatcher) ?? 'Dispatcher'} · {chatTarget.trackingCode}
                  </p>
                </div>
              </div>
              <button onClick={() => setChatTarget(null)} className="p-1.5 rounded-lg hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {sentOk && (
                <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Message delivered and dispatcher notified.
                </div>
              )}
              {sendError && (
                <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 bg-red-50 text-red-700 border border-red-200">
                  <X className="w-4 h-4 shrink-0" /> {sendError}
                </div>
              )}
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                rows={4}
                placeholder="Type your message to the dispatcher…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 text-sm"
              />
              <p className="text-xs text-slate-400">
                Delivered instantly as an in-app notification (and email if enabled). Linked to case {chatTarget.trackingCode}.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" className="rounded-xl" onClick={() => setChatTarget(null)}>
                  Close
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={sending || !chatMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string
  value: number | string
  sub: string
  tone: 'emerald' | 'amber' | 'blue' | 'violet'
  icon: React.ElementType
}) {
  const tones = {
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
    violet: 'text-violet-600 bg-violet-50',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl ${tones[tone]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      {children ?? <p className="font-semibold text-slate-800 mt-0.5">{value}</p>}
    </div>
  )
}
