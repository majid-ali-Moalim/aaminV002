'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, Loader2, RefreshCw, Search } from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

const TABS = [
  { id: 'incoming', label: 'Incoming Cases' },
  { id: 'active', label: 'Active Incoming Missions' },
  { id: 'accepted', label: 'Accepted Cases' },
  { id: 'rejected', label: 'Rejected Cases' },
  { id: 'completed', label: 'Completed Cases' },
] as const

export default function HospitalCasesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'incoming'
  const [tab, setTab] = useState<string>(initialTab)
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const qTab = searchParams.get('tab')
    if (qTab && qTab !== tab) setTab(qTab)
  }, [searchParams, tab])

  const load = () => {
    setLoading(true)
    hospitalAppApi
      .listCases({ tab, search: search || undefined })
      .then((d) => setCases(Array.isArray(d) ? d : d?.items ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [tab, search])

  const rows = useMemo(() => cases, [cases])

  const switchTab = (id: string) => {
    setTab(id)
    router.replace(`/hospital/emergency-cases?tab=${id}`)
  }

  const accept = async (id: string) => {
    const staff = prompt('Receiving staff name (optional):') || undefined
    try {
      await hospitalAppApi.acceptCase(id, staff)
      toast.success('Case accepted')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not accept case')
    }
  }

  const reject = async (id: string) => {
    const notes = prompt('Rejection reason / notes:')
    if (!notes) return
    try {
      await hospitalAppApi.rejectCase(id, 'NO_BEDS', notes)
      toast.success('Case rejected')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not reject case')
    }
  }

  return (
    <div className="hosp-stack">
      <div className="hosp-cases-toolbar">
        <div className="hosp-search-wrap">
          <Search size={16} />
          <input
            placeholder="Search case ID, patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="hosp-icon-btn" onClick={load}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="hosp-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hosp-loading">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : rows.length === 0 ? (
        <div className="hosp-empty">No cases in this category.</div>
      ) : (
        <div className="hosp-table-wrap">
          <table className="hosp-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Priority</th>
                <th>Mission Status</th>
                <th>Ambulance</th>
                <th>Driver / Nurse</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const req = c.emergencyRequest ?? {}
                const driver = req.driver ? `${req.driver.firstName || ''} ${req.driver.lastName || ''}`.trim() : '—'
                const nurse = req.nurse ? `${req.nurse.firstName || ''} ${req.nurse.lastName || ''}`.trim() : '—'
                return (
                  <tr key={c.id}>
                    <td className="mono">{c.caseNumber || req.trackingCode}</td>
                    <td>{req.patient?.fullName || req.callerName || '—'}</td>
                    <td>
                      <span className={`hosp-priority ${c.priority?.toLowerCase()}`}>{c.priority}</span>
                    </td>
                    <td>{req.status?.replace(/_/g, ' ') ?? '—'}</td>
                    <td>{req.ambulance?.ambulanceNumber || '—'}</td>
                    <td>
                      {driver} / {nurse}
                    </td>
                    <td>{c.status?.replace(/_/g, ' ')}</td>
                    <td className="hosp-actions">
                      {tab === 'incoming' && (
                        <>
                          <button type="button" className="hosp-btn primary" onClick={() => accept(c.id)}>
                            Accept
                          </button>
                          <button type="button" className="hosp-btn ghost" onClick={() => reject(c.id)}>
                            Reject
                          </button>
                        </>
                      )}
                      <Link href={`/hospital/emergency-cases/${c.id}`} className="hosp-btn ghost" title="Open case">
                        <Eye size={14} /> Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
