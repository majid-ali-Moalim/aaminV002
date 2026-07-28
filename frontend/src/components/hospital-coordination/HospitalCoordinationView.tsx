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
  Eye,
  User,
  Truck,
  Calendar,
  FileText,
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
  const [rejectedTotalCount, setRejectedTotalCount] = useState(0)
  const [acceptedTotalCount, setAcceptedTotalCount] = useState(0)
  const [detailCase, setDetailCase] = useState<any | null>(null)

  const titles: Record<CoordinationView, { title: string; desc: string }> = {
    'all-hospitals': { title: 'All Hospitals', desc: 'All registered hospitals in the coordination network' },
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
        const listFilters = {
          stage: stageMap[view],
          search: search || undefined,
          regionId: regionId || undefined,
          districtId: districtId || undefined,
        }
        const requests = [
          hospitalCoordinationService.listCases(listFilters),
          locationPromise,
          overviewPromise,
        ]
        if (view === 'refused') {
          requests.push(
            hospitalCoordinationService.listCases({ stage: 'REFUSED' }),
            hospitalCoordinationService.listCases({ stage: 'ACCEPTED' }),
          )
        }
        const results = await Promise.all(requests)
        const caseRows = results[0] as any[]
        setCases(caseRows ?? [])
        if (view === 'refused') {
          const allRejected = results[3] as any[]
          const allAccepted = results[4] as any[]
          setRejectedTotalCount(allRejected?.length ?? 0)
          setAcceptedTotalCount(allAccepted?.length ?? 0)
        }
      } else if (view === 'all-hospitals') {
        const [rows] = await Promise.all([
          hospitalCoordinationService.listHospitals({
            search: search || undefined,
            regionId: regionId || undefined,
            districtId: districtId || undefined,
            hospitalType: hospitalType || undefined,
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
        { label: 'Total Hospitals', value: k.totalHospitals ?? 0, icon: Building2, accent: 'teal' },
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
        { label: 'Total Rejected Cases', value: rejectedTotalCount, icon: XCircle, accent: 'rose' },
        { label: 'Total Accepted Cases', value: acceptedTotalCount, icon: CheckCircle2, accent: 'green' },
      ],
      analytics: [],
    }
    return map[view] ?? []
  }, [view, overview, analytics, cases, rejectedTotalCount, acceptedTotalCount])

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

      <div className={`grid gap-4 ${view === 'refused' ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' : 'grid-cols-2 lg:grid-cols-4'}`}>
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
      ) : view === 'refused' ? (
        <RefusedCasesTable
          cases={cases}
          loading={dataLoading && cases.length === 0}
          onShow={setDetailCase}
        />
      ) : view === 'accepted' ? (
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

      {detailCase && (
        <RefusedCaseDetailModal caseRow={detailCase} onClose={() => setDetailCase(null)} />
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

function HospitalTable({ hospitals, loading }: { hospitals: any[]; loading?: boolean }) {
  if (loading) return <ContentSkeleton rows={5} />
  if (!hospitals.length) {
    return <p className="text-center py-16 text-gray-500">No hospitals found</p>
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

function formatEmployeeName(person?: { firstName?: string | null; lastName?: string | null; fullName?: string | null } | null) {
  if (!person) return '—'
  if (person.fullName) return person.fullName
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return name || '—'
}

function RefusedCasesTable({
  cases,
  loading,
  onShow,
}: {
  cases: any[]
  loading?: boolean
  onShow: (row: any) => void
}) {
  if (loading) return <ContentSkeleton rows={5} />
  if (!cases.length) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed py-16 text-center">
        <XCircle className="w-10 h-10 text-rose-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No rejected cases found</p>
        <p className="text-sm text-gray-500 mt-1">Hospital refusals will appear here when recorded from active missions.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-gray-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Case #</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Mission</th>
              <th className="px-4 py-3 text-left">Hospital</th>
              <th className="px-4 py-3 text-left">Refusal reason</th>
              <th className="px-4 py-3 text-left">Rejected at</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
            {cases.map((row) => {
              const req = row.emergencyRequest
              const hospitalName = row.hospital?.name ?? row.rejectedHospitals?.[0]?.hospitalName ?? '—'
              const reason =
                row.refusalReason
                  ? refusalReasonLabel(row.refusalReason)
                  : row.rejectedHospitals?.[0]?.refusalReason ?? 'Not specified'

              return (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-teal-700">{row.caseNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{req?.patient?.fullName ?? 'Unknown'}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{req?.priority ?? row.priority}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{req?.trackingCode ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{hospitalName}</p>
                    <p className="text-xs text-gray-500">
                      {row.hospital?.region?.name}
                      {row.hospital?.district?.name ? ` / ${row.hospital.district.name}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                      {reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg font-bold gap-1.5"
                      onClick={() => onShow(row)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Show
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RefusedCaseDetailModal({ caseRow, onClose }: { caseRow: any; onClose: () => void }) {
  const req = caseRow.emergencyRequest
  const hospital = caseRow.hospital
  const rejected = caseRow.rejectedHospitals ?? []
  const accepted = caseRow.acceptedHospital
  const nurse = caseRow.nurseHandover

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-100">Rejected case details</p>
            <h2 className="text-xl font-black text-white mt-1">{caseRow.caseNumber}</h2>
            <p className="text-rose-100 text-sm mt-1">
              Mission {req?.trackingCode} · {req?.patient?.fullName ?? 'Patient'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailStat icon={User} label="Patient" value={req?.patient?.fullName ?? '—'} />
            <DetailStat icon={AlertTriangle} label="Priority" value={req?.priority ?? caseRow.priority ?? '—'} />
            <DetailStat icon={Calendar} label="Rejected at" value={new Date(caseRow.updatedAt).toLocaleString()} />
            <DetailStat icon={FileText} label="Status" value="Rejected" accent="rose" />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <SectionCard title="Mission information" icon={Truck}>
              <InfoLine label="Tracking code" value={req?.trackingCode} mono />
              <InfoLine label="Pickup location" value={req?.pickupLocation} />
              <InfoLine label="Destination" value={req?.destination ?? accepted?.hospitalName ?? 'TBD'} />
              <InfoLine label="Incident category" value={req?.incidentCategory?.name} />
              <InfoLine label="Symptoms" value={req?.symptoms} />
              <InfoLine label="Dispatcher" value={formatEmployeeName(req?.dispatcher)} />
            </SectionCard>

            <SectionCard title="Field team" icon={Stethoscope}>
              <InfoLine label="Ambulance" value={req?.ambulance?.ambulanceNumber ?? req?.ambulance?.plateNumber} />
              <InfoLine label="Driver" value={formatEmployeeName(req?.driver)} />
              <InfoLine label="Nurse" value={nurse?.nurseName ?? formatEmployeeName(req?.nurse)} />
              {req?.driver?.phone && <InfoLine label="Driver phone" value={req.driver.phone} />}
              {req?.nurse?.phone && <InfoLine label="Nurse phone" value={req.nurse.phone} />}
            </SectionCard>
          </div>

          <SectionCard title="Rejected hospital" icon={Building2} accent="rose">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoLine label="Hospital" value={hospital?.name} />
              <InfoLine label="Hospital code" value={hospital?.hospitalCode} mono />
              <InfoLine
                label="Location"
                value={
                  hospital?.address
                    ? `${hospital.address}${hospital.region?.name ? ` — ${hospital.region.name}` : ''}${hospital.district?.name ? ` / ${hospital.district.name}` : ''}`
                    : [hospital?.region?.name, hospital?.district?.name].filter(Boolean).join(' / ') || '—'
                }
              />
              <InfoLine label="Contact" value={hospital?.primaryPhone} />
              <InfoLine label="Emergency line" value={hospital?.emergencyHotline ?? hospital?.emergencyShortCode} />
              <InfoLine label="Email" value={hospital?.email} />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-700 mb-2">Refusal details</p>
              <p className="font-bold text-rose-900">{refusalReasonLabel(caseRow.refusalReason)}</p>
              {caseRow.refusalNotes && <p className="text-sm text-gray-700 mt-2">{caseRow.refusalNotes}</p>}
            </div>
          </SectionCard>

          {rejected.length > 0 && (
            <SectionCard title="All rejected hospitals for this mission" icon={XCircle} accent="rose">
              <div className="space-y-3">
                {rejected.map((r: any, i: number) => (
                  <div key={`${r.hospitalId}-${i}`} className="p-3 rounded-xl border border-rose-100 bg-rose-50/50">
                    <p className="font-bold text-gray-900">{r.hospitalName}</p>
                    <p className="text-sm text-rose-700 mt-0.5">{r.refusalReason}</p>
                    {r.refusalNotes && <p className="text-sm text-gray-600 mt-1">{r.refusalNotes}</p>}
                    {r.rejectedAt && (
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(r.rejectedAt).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {accepted && (
            <SectionCard title="Accepted hospital" icon={CheckCircle2} accent="green">
              <InfoLine label="Hospital" value={accepted.hospitalName} />
              <InfoLine label="Receiving staff" value={accepted.receivingStaffName} />
              {accepted.acceptedAt && (
                <InfoLine label="Accepted at" value={new Date(accepted.acceptedAt).toLocaleString()} />
              )}
              {accepted.handoverCompletedAt && (
                <InfoLine label="Handover completed" value={new Date(accepted.handoverCompletedAt).toLocaleString()} />
              )}
            </SectionCard>
          )}

          {nurse && (
            <SectionCard title="Nurse handover notes" icon={Stethoscope} accent="blue">
              <InfoLine label="Nurse" value={nurse.nurseName} />
              {nurse.interventions && <InfoLine label="Interventions" value={String(nurse.interventions)} />}
              {nurse.notes && <InfoLine label="Clinical notes" value={nurse.notes} />}
              {nurse.recordedAt && (
                <InfoLine label="Recorded at" value={new Date(nurse.recordedAt).toLocaleString()} />
              )}
            </SectionCard>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 shrink-0 flex justify-end">
          <Button variant="outline" className="rounded-xl font-bold" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: 'rose' | 'green'
}) {
  const accentClass =
    accent === 'rose' ? 'text-rose-700' : accent === 'green' ? 'text-emerald-700' : 'text-gray-900 dark:text-white'
  return (
    <div className="rounded-xl border border-slate-100 dark:border-gray-800 p-4 bg-slate-50/50 dark:bg-gray-800/30">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`font-bold text-sm ${accentClass}`}>{value}</p>
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  icon: React.ElementType
  accent?: 'rose' | 'green' | 'blue'
  children: React.ReactNode
}) {
  const border =
    accent === 'rose'
      ? 'border-rose-100'
      : accent === 'green'
        ? 'border-emerald-100'
        : accent === 'blue'
          ? 'border-blue-100'
          : 'border-slate-100 dark:border-gray-800'
  return (
    <div className={`rounded-2xl border ${border} p-5 bg-white dark:bg-gray-900 shadow-sm`}>
      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoLine({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="mb-2.5 last:mb-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
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
