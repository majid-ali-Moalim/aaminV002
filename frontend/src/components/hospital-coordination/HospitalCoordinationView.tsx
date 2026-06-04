'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  MapPin,
  Search,
  XCircle,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { hospitalCoordinationService, hospitalsService } from '@/lib/api'
import { getCachedDistricts, getCachedRegions, loadLocationReferenceData } from '@/lib/cache/referenceData'
import { AVAILABILITY_STATUSES, REFUSAL_REASONS, type CoordinationView } from '@/lib/hospital-coordination/constants'
import HospitalForm from '@/components/features/system-setup/HospitalForm'

function KpiCard({ label, value, icon: Icon, accent = 'teal' }: { label: string; value: number | string; icon: React.ElementType; accent?: string }) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function HospitalCoordinationView({ view }: { view: CoordinationView }) {
  const [dataLoading, setDataLoading] = useState(false)
  const [overview, setOverview] = useState<any>(null)
  const [hospitals, setHospitals] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [regions, setRegions] = useState<any[]>(() => getCachedRegions() ?? [])
  const [districts, setDistricts] = useState<any[]>(() => getCachedDistricts() ?? [])
  const [search, setSearch] = useState('')
  const [regionId, setRegionId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [hospitalType, setHospitalType] = useState('')
  const [modalHospital, setModalHospital] = useState<any>(null)
  const [availabilityModal, setAvailabilityModal] = useState<any>(null)
  const [rejectModal, setRejectModal] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('NO_BEDS')
  const [analyticsRange, setAnalyticsRange] = useState({ startDate: '', endDate: '' })
  const [avForm, setAvForm] = useState({
    beds: 0,
    occupiedBeds: 0,
    icuTotalBeds: 0,
    icuOccupiedBeds: 0,
    availabilityStatus: 'Available',
  })

  const titles: Record<CoordinationView, { title: string; desc: string }> = {
    'all-hospitals': { title: 'All Hospitals', desc: 'Central directory of registered healthcare facilities' },
    availability: { title: 'Hospital Availability', desc: 'Real-time capacity and operational readiness' },
    incoming: { title: 'Incoming Cases', desc: 'Ambulance cases pending hospital review and acceptance' },
    handover: { title: 'Handover Queue', desc: 'Arriving ambulances awaiting patient handover' },
    accepted: { title: 'Accepted Cases', desc: 'Patients accepted and under hospital care' },
    refused: { title: 'Refused / Full Cases', desc: 'Cases declined due to capacity or operational limits' },
    analytics: { title: 'Hospital Performance Analytics', desc: 'Acceptance rates, handover times, and capacity trends' },
  }

  const load = useCallback(async () => {
    setDataLoading(true)
    try {
      const locationPromise = loadLocationReferenceData().then(({ regions: r, districts: d }) => {
        setRegions(r)
        setDistricts(d)
      })

      const overviewPromise = hospitalCoordinationService.getOverview().then(setOverview)

      if (view === 'analytics') {
        const [analyticsData] = await Promise.all([
          hospitalCoordinationService.getAnalytics({
            regionId: regionId || undefined,
            startDate: analyticsRange.startDate || undefined,
            endDate: analyticsRange.endDate || undefined,
          }),
          locationPromise,
          overviewPromise,
        ])
        setAnalytics(analyticsData)
      } else if (['incoming', 'handover', 'accepted', 'refused'].includes(view)) {
        const stageMap: Record<string, string> = {
          incoming: 'INCOMING',
          handover: 'HANDOVER',
          accepted: 'ACCEPTED',
          refused: 'REFUSED',
        }
        const [caseRows] = await Promise.all([
          hospitalCoordinationService.listCases({
            stage: stageMap[view],
            search: search || undefined,
            regionId: regionId || undefined,
            districtId: districtId || undefined,
          }),
          locationPromise,
          overviewPromise,
        ])
        setCases(caseRows ?? [])
      } else {
        const params: Record<string, string | boolean | undefined> = {
          search: search || undefined,
          regionId: regionId || undefined,
          districtId: districtId || undefined,
          hospitalType: hospitalType || undefined,
        }
        if (view === 'availability') {
          params.status = statusFilter || undefined
        } else if (statusFilter === 'active') {
          params.isActive = true
        } else if (statusFilter === 'inactive') {
          params.isActive = false
        }
        const [rows] = await Promise.all([
          hospitalCoordinationService.listHospitals(params),
          locationPromise,
          overviewPromise,
        ])
        setHospitals(rows ?? [])
      }
    } catch {
      toast.error('Failed to load hospital coordination data')
    } finally {
      setDataLoading(false)
    }
  }, [view, search, regionId, districtId, statusFilter, hospitalType, analyticsRange.startDate, analyticsRange.endDate])

  useEffect(() => {
    load()
  }, [load])

  const kpis = useMemo(() => {
    const k = overview?.kpis ?? {}
    if (view === 'analytics' && analytics?.kpis) {
      return [
        { label: 'Cases Received', value: analytics.kpis.casesReceived, icon: Activity, accent: 'teal' },
        { label: 'Accepted', value: analytics.kpis.casesAccepted, icon: CheckCircle2, accent: 'green' },
        { label: 'Refused', value: analytics.kpis.casesRefused, icon: XCircle, accent: 'rose' },
        { label: 'Acceptance Rate', value: `${analytics.kpis.acceptanceRate}%`, icon: BarChart3, accent: 'blue' },
      ]
    }
    const map: Record<CoordinationView, typeof kpis> = {
      'all-hospitals': [
        { label: 'Total Hospitals', value: k.totalHospitals ?? 0, icon: Building2, accent: 'teal' },
        { label: 'Active', value: k.activeHospitals ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Inactive', value: k.inactiveHospitals ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Emergency Centers', value: k.emergencyCenters ?? 0, icon: Activity, accent: 'amber' },
      ],
      availability: [
        { label: 'Available', value: k.availableHospitals ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Full Capacity', value: k.fullHospitals ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Busy', value: k.busyHospitals ?? 0, icon: AlertTriangle, accent: 'amber' },
        { label: 'Total', value: k.totalHospitals ?? 0, icon: BarChart3, accent: 'blue' },
      ],
      incoming: [
        { label: 'Incoming Today', value: k.incomingToday ?? 0, icon: Activity, accent: 'teal' },
        { label: 'Pending Review', value: k.pendingIncoming ?? 0, icon: Clock, accent: 'amber' },
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Rejected Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
      ],
      handover: [
        { label: 'Current Queue', value: k.queueCount ?? 0, icon: Clock, accent: 'amber' },
        { label: 'Incoming Today', value: k.incomingToday ?? 0, icon: Activity, accent: 'teal' },
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Full Hospitals', value: k.fullHospitals ?? 0, icon: Building2, accent: 'rose' },
      ],
      accepted: [
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Pending Incoming', value: k.pendingIncoming ?? 0, icon: Clock, accent: 'amber' },
        { label: 'Queue', value: k.queueCount ?? 0, icon: Activity, accent: 'teal' },
        { label: 'Refused Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
      ],
      refused: [
        { label: 'Refused Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Full Hospitals', value: k.fullHospitals ?? 0, icon: Building2, accent: 'amber' },
        { label: 'Incoming Today', value: k.incomingToday ?? 0, icon: Activity, accent: 'teal' },
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
      ],
      analytics: [],
    }
    return map[view] ?? []
  }, [view, overview, analytics])

  const meta = titles[view]

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{meta.title}</h1>
            <p className="text-sm text-gray-500">{meta.desc}</p>
          </div>
        </div>
        {view === 'all-hospitals' && (
          <Button asChild className="rounded-xl font-bold">
            <Link href="/admin/hospitals/create">Add Hospital</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} value={dataLoading && !overview ? '—' : k.value} />
        ))}
      </div>

      {view !== 'analytics' && (
        <FilterBar
          search={search}
          setSearch={setSearch}
          regionId={regionId}
          setRegionId={setRegionId}
          districtId={districtId}
          setDistrictId={setDistrictId}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          hospitalType={hospitalType}
          setHospitalType={setHospitalType}
          regions={regions}
          districts={districts}
          showAvailability={view === 'availability'}
          showActiveStatus={view === 'all-hospitals'}
          showType={view === 'all-hospitals'}
          onApply={load}
        />
      )}

      <div className={dataLoading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
      {view === 'analytics' ? (
        <AnalyticsPanel
          analytics={analytics}
          analyticsRange={analyticsRange}
          setAnalyticsRange={setAnalyticsRange}
          onApply={load}
          regionId={regionId}
          setRegionId={setRegionId}
          regions={regions}
          loading={dataLoading && !analytics}
        />
      ) : ['incoming', 'handover', 'accepted', 'refused'].includes(view) ? (
        <div className="space-y-3">
          {dataLoading && cases.length === 0 ? (
            <ContentSkeleton rows={4} />
          ) : cases.length === 0 ? (
            <p className="text-center py-16 text-gray-500">No cases in this view</p>
          ) : (
            cases.map((c) => (
              <CaseCard
                key={c.id}
                caseRow={c}
                view={view}
                onAction={load}
                onReject={(row) => setRejectModal(row)}
              />
            ))
          )}
        </div>
      ) : (
        <HospitalTable
          hospitals={hospitals}
          view={view}
          loading={dataLoading && hospitals.length === 0}
          onEdit={(h) => setModalHospital(h)}
          onAvailability={(h) => {
            setAvailabilityModal(h)
            setAvForm({
              beds: h.beds ?? 0,
              occupiedBeds: h.occupiedBeds ?? 0,
              icuTotalBeds: h.icuTotalBeds ?? 0,
              icuOccupiedBeds: h.icuOccupiedBeds ?? 0,
              availabilityStatus: h.availabilityStatus ?? 'Available',
            })
          }}
          onToggleActive={async (h) => {
            if (h.isActive) await hospitalCoordinationService.deactivateHospital(h.id)
            else await hospitalCoordinationService.activateHospital(h.id)
            load()
          }}
        />
      )}
      </div>

      {modalHospital !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <HospitalForm
            regions={regions}
            districts={districts}
            initialData={modalHospital.id ? modalHospital : undefined}
            loading={false}
            onCancel={() => setModalHospital(null)}
            onSubmit={async (data) => {
              try {
                if (modalHospital?.id) await hospitalsService.update(modalHospital.id, data)
                else await hospitalsService.create(data)
                toast.success('Hospital saved')
                setModalHospital(null)
                load()
              } catch {
                toast.error('Save failed')
              }
            }}
          />
        </div>
      )}

      {availabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-black">Update — {availabilityModal.name}</h3>
            {(['beds', 'occupiedBeds', 'icuTotalBeds', 'icuOccupiedBeds'] as const).map((f) => (
              <div key={f}>
                <label className="text-xs font-bold text-gray-500 uppercase">{f}</label>
                <input
                  type="number"
                  className="w-full h-10 rounded-xl border px-3 mt-1"
                  value={avForm[f]}
                  onChange={(e) => setAvForm({ ...avForm, [f]: Number(e.target.value) })}
                />
              </div>
            ))}
            <select
              className="w-full h-10 rounded-xl border px-3"
              value={avForm.availabilityStatus}
              onChange={(e) => setAvForm({ ...avForm, availabilityStatus: e.target.value })}
            >
              {AVAILABILITY_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvailabilityModal(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await hospitalCoordinationService.updateAvailability(availabilityModal.id, avForm)
                  toast.success('Updated')
                  setAvailabilityModal(null)
                  load()
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-black">Reject Case — {rejectModal.caseNumber}</h3>
            <select
              className="w-full h-10 rounded-xl border px-3"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            >
              {REFUSAL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await hospitalCoordinationService.rejectCase(rejectModal.id, rejectReason)
                  toast.success('Case rejected')
                  setRejectModal(null)
                  load()
                }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterBar(props: any) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border p-4 flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-10 h-10 rounded-xl border text-sm"
          placeholder="Search..."
          value={props.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.setSearch(e.target.value)}
        />
      </div>
      <select className="h-10 rounded-xl border px-3 text-sm" value={props.regionId} onChange={(e) => props.setRegionId(e.target.value)}>
        <option value="">All regions</option>
        {props.regions.map((r: any) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <select className="h-10 rounded-xl border px-3 text-sm" value={props.districtId} onChange={(e) => props.setDistrictId(e.target.value)}>
        <option value="">All districts</option>
        {props.districts.filter((d: any) => !props.regionId || d.regionId === props.regionId).map((d: any) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {props.showType && (
        <select className="h-10 rounded-xl border px-3 text-sm" value={props.hospitalType} onChange={(e) => props.setHospitalType(e.target.value)}>
          <option value="">All types</option>
          {['Government Hospital', 'Private Hospital', 'Military Hospital', 'Teaching Hospital', 'NGO Hospital'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}
      {props.showActiveStatus && (
        <select className="h-10 rounded-xl border px-3 text-sm" value={props.statusFilter} onChange={(e) => props.setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      )}
      {props.showAvailability && (
        <select className="h-10 rounded-xl border px-3 text-sm" value={props.statusFilter} onChange={(e) => props.setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          {AVAILABILITY_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
      <Button variant="outline" className="rounded-xl" onClick={props.onApply}>Apply</Button>
    </div>
  )
}

function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  )
}

function HospitalTable({ hospitals, view, loading, onEdit, onAvailability, onToggleActive }: any) {
  if (loading) {
    return <ContentSkeleton rows={5} />
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
          <tr>
            <th className="p-4 text-left">Hospital</th>
            <th className="p-4 text-left">Location</th>
            <th className="p-4 text-left">Capacity</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {hospitals.map((h: any) => {
            const cap = h.beds ? Math.round(((h.occupiedBeds ?? 0) / h.beds) * 100) : 0
            return (
              <tr key={h.id}>
                <td className="p-4 font-bold">{h.name}</td>
                <td className="p-4 text-xs text-gray-500"><MapPin className="w-3 h-3 inline" /> {h.region?.name}/{h.district?.name}</td>
                <td className="p-4 text-xs">{h.occupiedBeds ?? 0}/{h.beds} ({cap}%)</td>
                <td className="p-4"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{h.isActive ? h.availabilityStatus : 'Inactive'}</span></td>
                <td className="p-4 text-right gap-1">
                  {view === 'availability' && <Button size="sm" variant="outline" onClick={() => onAvailability(h)}>Update</Button>}
                  {view === 'all-hospitals' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onEdit(h)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => onToggleActive(h)}>{h.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AnalyticsPanel({
  analytics,
  analyticsRange,
  setAnalyticsRange,
  onApply,
  regionId,
  setRegionId,
  regions,
  loading,
}: {
  analytics: any
  analyticsRange: { startDate: string; endDate: string }
  setAnalyticsRange: (v: { startDate: string; endDate: string }) => void
  onApply: () => void
  regionId: string
  setRegionId: (v: string) => void
  regions: any[]
  loading?: boolean
}) {
  const exportCsv = () => {
    const rows = analytics?.byHospital ?? []
    const csv = ['Hospital,Received,Accepted,Refused', ...rows.map((h: any) => `${h.name},${h.received},${h.accepted},${h.refused ?? 0}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hospital-performance.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border p-4 flex flex-wrap gap-3">
        <input type="date" className="h-10 rounded-xl border px-3 text-sm" value={analyticsRange.startDate} onChange={(e) => setAnalyticsRange({ ...analyticsRange, startDate: e.target.value })} />
        <input type="date" className="h-10 rounded-xl border px-3 text-sm" value={analyticsRange.endDate} onChange={(e) => setAnalyticsRange({ ...analyticsRange, endDate: e.target.value })} />
        <select className="h-10 rounded-xl border px-3 text-sm" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <Button variant="outline" className="rounded-xl" onClick={onApply}>Apply</Button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </>
        ) : (
          <>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
          <h3 className="font-black mb-4">Performance</h3>
          <p className="text-sm">Avg handover: {analytics?.kpis?.avgHandoverTimeMins ?? 0} min</p>
          <p className="text-sm">Avg waiting: {analytics?.kpis?.avgWaitingTimeMins ?? 0} min</p>
          <p className="text-sm">Acceptance rate: {analytics?.kpis?.acceptanceRate ?? 0}%</p>
          <p className="text-sm">Refusal rate: {analytics?.kpis?.refusalRate ?? 0}%</p>
          <p className="text-sm">Capacity utilization: {analytics?.kpis?.capacityUtilization ?? 0}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border p-6">
          <h3 className="font-black mb-4">By Hospital</h3>
          <ul className="text-sm space-y-2">
            {(analytics?.byHospital ?? []).map((h: any) => (
              <li key={h.name} className="flex justify-between"><span>{h.name}</span><span>{h.accepted}/{h.received}</span></li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

function CaseCard({
  caseRow,
  view,
  onAction,
  onReject,
}: {
  caseRow: any
  view: CoordinationView
  onAction: () => void
  onReject?: (row: any) => void
}) {
  const req = caseRow.emergencyRequest
  const waitingMins = caseRow.arrivalTime
    ? Math.round((Date.now() - new Date(caseRow.arrivalTime).getTime()) / 60000)
    : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-teal-600 uppercase">{caseRow.caseNumber}</p>
          <h3 className="font-black text-lg">{req?.patient?.fullName ?? 'Patient'}</h3>
          <p className="text-sm text-gray-500">
            Mission {req?.trackingCode} · {caseRow.hospital?.name}
          </p>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          {caseRow.status?.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs text-gray-500">
        <p><strong className="text-gray-700">Severity:</strong> {req?.priority ?? caseRow.priority ?? '—'}</p>
        <p><strong className="text-gray-700">Ambulance:</strong> {req?.ambulance?.plateNumber ?? '—'}</p>
        <p><strong className="text-gray-700">Driver:</strong> {req?.driver?.fullName ?? '—'}</p>
        {view === 'handover' && waitingMins !== null && (
          <p><strong className="text-gray-700">Waiting:</strong> {waitingMins} min</p>
        )}
        {view === 'refused' && caseRow.refusalReason && (
          <p><strong className="text-gray-700">Reason:</strong> {caseRow.refusalReason.replace(/_/g, ' ')}</p>
        )}
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        {view === 'incoming' && (
          <>
            <Button size="sm" onClick={async () => { await hospitalCoordinationService.acceptCase(caseRow.id); toast.success('Accepted'); onAction() }}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => onReject?.(caseRow)}>Reject</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await hospitalCoordinationService.moveToHandover(caseRow.id); onAction() }}>Mark Arriving</Button>
          </>
        )}
        {view === 'handover' && caseRow.status === 'WAITING' && (
          <Button size="sm" onClick={async () => { await hospitalCoordinationService.startHandover(caseRow.id); onAction() }}>Start Handover</Button>
        )}
        {view === 'handover' && caseRow.status === 'IN_PROGRESS' && (
          <Button size="sm" onClick={async () => { await hospitalCoordinationService.completeHandover(caseRow.id); onAction() }}>Complete</Button>
        )}
        {view === 'accepted' && (
          <>
            <Button size="sm" variant="outline" onClick={async () => { await hospitalCoordinationService.updateCaseStatus(caseRow.id, 'ADMITTED'); onAction() }}>Mark Admitted</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await hospitalCoordinationService.updateCaseStatus(caseRow.id, 'DISCHARGED'); onAction() }}>Discharge</Button>
          </>
        )}
      </div>
    </div>
  )
}
