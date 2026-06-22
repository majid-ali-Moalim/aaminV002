'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Activity,
  ClipboardList,
  HeartPulse,
  Stethoscope,
  Truck,
  User,
  Zap,
} from 'lucide-react'
import { emergencyRequestsService, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNotificationStore } from '@/lib/stores/notificationStore'

const CLOSED = ['COMPLETED', 'CANCELLED']

export default function NurseDashboardView() {
  const { fullName, nurseId, shiftStatus } = useNurseEmployee()
  const { stats: notifStats, recent } = useNotificationStore()
  const [greeting, setGreeting] = useState('Hello')
  const [cases, setCases] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  useEffect(() => {
    if (!nurseId) return
    const load = () => {
      emergencyRequestsService.getAll().then((d) => setCases(Array.isArray(d) ? d : [])).catch(() => {})
      nursesService.getPatientCareRecords(nurseId).then((d) => setRecords(Array.isArray(d) ? d : [])).catch(() => {})
    }
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [nurseId])

  const myCases = useMemo(
    () => cases.filter((r) => r.nurseId === nurseId),
    [cases, nurseId],
  )

  const kpis = useMemo(() => {
    const today = new Date().toDateString()
    const assignedToday = myCases.filter(
      (r) => r.assignedAt && new Date(r.assignedAt).toDateString() === today,
    ).length
    const active = myCases.filter((r) => !CLOSED.includes(r.status)).length
    const completed = myCases.filter((r) => r.status === 'COMPLETED').length
    const transporting = myCases.filter((r) => r.status === 'TRANSPORTING').length
    const pendingHandover = myCases.filter((r) =>
      ['TRANSPORTING', 'ARRIVED_HOSPITAL'].includes(r.status),
    ).length
    const critical = myCases.filter(
      (r) => !CLOSED.includes(r.status) && r.priority === 'CRITICAL',
    ).length

    return {
      assignedToday,
      active,
      completed,
      transporting,
      pendingHandover,
      critical,
      treatments: records.length,
      shiftStatus: shiftStatus || 'AVAILABLE',
    }
  }, [myCases, records, shiftStatus])

  const activityFeed = useMemo(() => {
    const entries: Array<{ time: string; text: string }> = []
    recent.slice(0, 8).forEach((n) => {
      entries.push({
        time: n.createdAt ? format(new Date(n.createdAt), 'HH:mm') : '',
        text: `${n.title}: ${n.message}`,
      })
    })
    myCases
      .filter((r) => !CLOSED.includes(r.status))
      .slice(0, 5)
      .forEach((r) => {
        entries.push({
          time: r.updatedAt ? format(new Date(r.updatedAt), 'HH:mm') : '',
          text: `${r.trackingCode} — ${r.status?.replace(/_/g, ' ')}`,
        })
      })
    return entries.slice(0, 10)
  }, [recent, myCases])

  const todayMissions = myCases
    .filter((r) => !CLOSED.includes(r.status))
    .slice(0, 6)

  const quickActions = [
    { label: 'Open Mission Workspace', href: '/nurse/mission', icon: HeartPulse },
    { label: 'Start Assessment', href: '/nurse/mission', icon: Stethoscope },
    { label: 'Record Vital Signs', href: '/nurse/medical-records?tab=vitals', icon: Activity },
    { label: 'Add Treatment', href: '/nurse/mission', icon: Zap },
    { label: 'Complete Handover', href: '/nurse/mission', icon: ClipboardList },
  ]

  return (
    <div className="nurse-dashboard">
      <div className="nurse-dash-hero">
        <HeartPulse size={32} />
        <div>
          <p className="text-red-300 text-sm">{greeting}, {fullName || 'Nurse'}</p>
          <h2>Clinical Operations Dashboard</h2>
          <p>Real-time patient care synchronized with drivers and dispatch.</p>
        </div>
        <span className="nurse-shift-badge on">{kpis.shiftStatus.replace(/_/g, ' ')}</span>
      </div>

      <div className="nurse-kpi-grid">
        {[
          { label: 'Assigned Today', value: kpis.assignedToday },
          { label: 'Active Patients', value: kpis.active },
          { label: 'Completed Treatments', value: kpis.treatments },
          { label: 'Pending Handovers', value: kpis.pendingHandover },
          { label: 'Emergency Cases', value: kpis.critical },
          { label: 'Unread Alerts', value: notifStats?.unread ?? 0 },
        ].map((k) => (
          <div key={k.label} className="nurse-stat-card">
            <span className="nurse-stat-value">{k.value}</span>
            <span className="nurse-stat-label">{k.label}</span>
          </div>
        ))}
      </div>

      <section className="nurse-dash-section">
        <h3>Quick Actions</h3>
        <div className="nurse-quick-actions">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Link key={a.label} href={a.href} className="nurse-quick-action-btn">
                <Icon size={16} />
                {a.label}
              </Link>
            )
          })}
        </div>
      </section>

      <div className="nurse-dash-columns">
        <section className="nurse-dash-section">
          <h3>Live Activity Feed</h3>
          <ul className="nurse-activity-feed">
            {activityFeed.length === 0 && <li className="muted">No recent activity</li>}
            {activityFeed.map((e, i) => (
              <li key={i}>
                <span className="time">{e.time}</span>
                <span className="text">{e.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="nurse-dash-section">
          <h3>Today&apos;s Mission Summary</h3>
          {todayMissions.length === 0 ? (
            <p className="nurse-empty-inline">No active missions assigned.</p>
          ) : (
            <div className="nurse-mission-table">
              {todayMissions.map((m) => (
                <Link
                  key={m.id}
                  href="/nurse/patient-care?tab=active"
                  className="nurse-mission-row"
                >
                  <span className="code">{m.trackingCode}</span>
                  <span className="patient">
                    <User size={12} />
                    {m.patient?.fullName || 'Patient'}
                  </span>
                  <span className="driver">
                    <Truck size={12} />
                    {m.driver ? `${m.driver.firstName || ''} ${m.driver.lastName || ''}`.trim() : '—'}
                  </span>
                  <span className="unit">{m.ambulance?.ambulanceNumber || '—'}</span>
                  <span className="status">{m.status?.replace(/_/g, ' ')}</span>
                  <span className={`nurse-priority ${m.priority?.toLowerCase()}`}>{m.priority}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
