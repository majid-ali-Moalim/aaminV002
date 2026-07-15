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
import { hospitalCoordinationService } from '@/lib/api'
import { getCachedDistricts, getCachedRegions, loadLocationReferenceData } from '@/lib/cache/referenceData'
import { AVAILABILITY_STATUSES, REFUSAL_REASONS, refusalReasonLabel, parseHospitalBranches, type CoordinationView } from '@/lib/hospital-coordination/constants'
import { Stethoscope, GitBranch } from 'lucide-react'

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
  const [analyticsRange, setAnalyticsRange] = useState({ startDate: '', endDate: '' })

  const titles: Record<CoordinationView, { title: string; desc: string }> = {
    'all-hospitals': { title: 'All Hospitals', desc: 'Hospitals with assigned emergency cases only' },
    accepted: { title: 'Accepted Cases', desc: 'Patients accepted with nurse handover and receiving hospital details' },
    refused: { title: 'Rejected Cases', desc: 'Cases declined with refusal reasons and hospital coordination history' },
    analytics: { title: 'Hospital Performance', desc: 'Acceptance rates, handover times, and capacity trends' },
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
      } else if (view === 'accepted' || view === 'refused') {
        const stageMap: Record<string, string> = {
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
      } else if (view === 'all-hospitals') {
        const [rows] = await Promise.all([
          hospitalCoordinationService.listHospitals({
            search: search || undefined,
            regionId: regionId || undefined,
            districtId: districtId || undefined,
            hospitalType: hospitalType || undefined,
            assignedCasesOnly: true,
          }),
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
        { label: 'Hospitals with Cases', value: k.totalHospitals ?? 0, icon: Building2, accent: 'teal' },
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Rejected Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Pending Review', value: k.pendingIncoming ?? 0, icon: Clock, accent: 'amber' },
      ],
      accepted: [
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Total Accepted', value: cases.length || '—', icon: Building2, accent: 'teal' },
        { label: 'Rejected Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Incoming Today', value: k.incomingToday ?? 0, icon: Activity, accent: 'blue' },
      ],
      refused: [
        { label: 'Rejected Today', value: k.refusedToday ?? 0, icon: XCircle, accent: 'rose' },
        { label: 'Full Hospitals', value: k.fullHospitals ?? 0, icon: Building2, accent: 'amber' },
        { label: 'Accepted Today', value: k.acceptedToday ?? 0, icon: CheckCircle2, accent: 'green' },
        { label: 'Incoming Today', value: k.incomingToday ?? 0, icon: Activity, accent: 'teal' },
      ],
      analytics: [],
    }
    return map[view] ?? []
  }, [view, overview, analytics, cases])

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
          showActiveStatus={false}
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
      ) : view === 'accepted' || view === 'refused' ? (
        <div className="space-y-4">
          {dataLoading && cases.length === 0 ? (
            <ContentSkeleton rows={4} />
          ) : cases.length === 0 ? (
            <p className="text-center py-16 text-gray-500">No cases in this view</p>
          ) : (
            cases.map((c) => (
              <CaseCard key={c.id} caseRow={c} view={view} onAction={load} />
            ))
          )}
        </div>
      ) : (
        <HospitalTable hospitals={hospitals} loading={dataLoading && hospitals.length === 0} />
      )}
      </div>
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

function HospitalTable({ hospitals, loading }: { hospitals: any[]; loading?: boolean }) {
  if (loading) return <ContentSkeleton rows={5} />
  if (!hospitals.length) {
    return <p className="text-center py-16 text-gray-500">No hospitals with assigned cases yet</p>
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-x-auto shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
          <tr>
            <th className="p-4 text-left">Hospital</th>
            <th className="p-4 text-left">Location</th>
            <th className="p-4 text-left">Contact</th>
            <th className="p-4 text-left">Branches</th>
            <th className="p-4 text-left">Assigned Cases</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {hospitals.map((h: any) => {
            const branches = parseHospitalBranches(h.branches)
            return (
              <tr key={h.id} className="hover:bg-gray-50/80">
                <td className="p-4">
                  <p className="font-bold text-gray-900">{h.name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{h.hospitalCode}</p>
                </td>
                <td className="p-4 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {h.region?.name}/{h.district?.name}
                  <p className="text-gray-400 mt-0.5">{h.address}</p>
                </td>
                <td className="p-4 text-xs text-gray-600">
                  <p>{h.primaryPhone}</p>
                  <p className="text-teal-700 font-bold">{h.emergencyShortCode || h.emergencyHotline}</p>
                  <p>{h.email}</p>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
                    <GitBranch className="w-3.5 h-3.5" /> {branches.length}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-lg font-black text-teal-700">{h.assignedCaseCount ?? 0}</span>
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
}: {
  caseRow: any
  view: CoordinationView
  onAction: () => void
}) {
  const req = caseRow.emergencyRequest
  const accepted = caseRow.acceptedHospital
  const rejected = caseRow.rejectedHospitals ?? []
  const nurse = caseRow.nurseHandover

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gradient-to-r from-teal-50 to-white dark:from-teal-950/30 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{caseRow.caseNumber}</p>
          <h3 className="font-black text-lg text-gray-900 dark:text-white">{req?.patient?.fullName ?? 'Patient'}</h3>
          <p className="text-sm text-gray-500">
            Mission {req?.trackingCode} · Priority {req?.priority ?? caseRow.priority}
          </p>
        </div>
        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${view === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {view === 'accepted' ? 'Accepted' : 'Rejected'}
        </span>
      </div>

      <div className="p-5 grid lg:grid-cols-3 gap-4">
        <div className="space-y-2 text-sm">
          <p className="text-[10px] font-black uppercase text-gray-400">Transport</p>
          <p><strong>Ambulance:</strong> {req?.ambulance?.plateNumber ?? '—'}</p>
          <p><strong>Driver:</strong> {req?.driver?.fullName ?? '—'}</p>
          <p><strong>Nurse:</strong> {nurse?.nurseName ?? req?.nurse?.fullName ?? '—'}</p>
          {caseRow.destinationBranchName && (
            <p className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /><strong>Branch:</strong> {caseRow.destinationBranchName}</p>
          )}
        </div>

        {accepted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm">
            <p className="text-[10px] font-black uppercase text-emerald-700 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Accepted Hospital
            </p>
            <p className="font-bold text-emerald-900">{accepted.hospitalName}</p>
            {accepted.receivingStaffName && <p className="text-xs mt-1">Receiving: {accepted.receivingStaffName}</p>}
            {accepted.handoverCompletedAt && (
              <p className="text-xs text-emerald-700 mt-1">Handover: {new Date(accepted.handoverCompletedAt).toLocaleString()}</p>
            )}
          </div>
        )}

        {(view === 'refused' || rejected.length > 0) && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm">
            <p className="text-[10px] font-black uppercase text-red-700 mb-2 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Rejected Hospitals
            </p>
            {rejected.length === 0 ? (
              <p className="text-xs text-red-800">
                {refusalReasonLabel(caseRow.refusalReason)} — {caseRow.hospital?.name}
              </p>
            ) : (
              <ul className="space-y-2">
                {rejected.map((r: any, i: number) => (
                  <li key={`${r.hospitalId}-${i}`} className="text-xs border-b border-red-100 pb-2 last:border-0">
                    <p className="font-bold text-red-900">{r.hospitalName}</p>
                    <p className="text-red-700">{r.refusalReason}</p>
                    {r.refusalNotes && <p className="text-gray-600 mt-0.5">{r.refusalNotes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {nurse && (
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
            <p className="text-[10px] font-black uppercase text-blue-700 mb-2 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" /> Nurse Handover
            </p>
            <p><strong>Nurse:</strong> {nurse.nurseName ?? '—'}</p>
            {nurse.interventions && <p className="mt-1"><strong>Interventions:</strong> {String(nurse.interventions)}</p>}
            {nurse.notes && <p className="mt-1 text-gray-600">{nurse.notes}</p>}
          </div>
        </div>
      )}

      {view === 'accepted' && (
        <div className="px-5 pb-5 flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={async () => { await hospitalCoordinationService.updateCaseStatus(caseRow.id, 'ADMITTED'); toast.success('Marked admitted'); onAction() }}>Mark Admitted</Button>
          <Button size="sm" variant="ghost" onClick={async () => { await hospitalCoordinationService.updateCaseStatus(caseRow.id, 'DISCHARGED'); toast.success('Discharged'); onAction() }}>Discharge</Button>
        </div>
      )}
    </div>
  )
}
