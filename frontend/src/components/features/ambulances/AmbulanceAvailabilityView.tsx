'use client'

import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Truck,
  Search,
  RefreshCw,
  Plus,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  User,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  Activity,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ambulancesService, employeesService, systemSetupService } from '@/lib/api'
import {
  type AmbulanceAvailabilityOverview,
  type AmbulanceAvailabilityRow,
  type OperationalAmbulanceStatus,
  type StatusFilterTab,
  OPERATIONAL_STATUS_CONFIG,
  formatTimeAgo,
} from '@/lib/ambulance/availability'
import { Employee, EmployeeRole } from '@/types'

const STATUS_TABS: { id: StatusFilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Unavailable' },
]

const DB_STATUS_FOR_OPERATIONAL: Record<OperationalAmbulanceStatus, string> = {
  available: 'AVAILABLE',
  unavailable: 'UNAVAILABLE',
}

export default function AmbulanceAvailabilityView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterTab>('all')
  const [regionFilter, setRegionFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [statusModal, setStatusModal] = useState<Pick<AmbulanceAvailabilityRow, 'id' | 'ambulanceNumber'> | null>(null)
  const [assignDriverModal, setAssignDriverModal] = useState<Pick<AmbulanceAvailabilityRow, 'id' | 'ambulanceNumber'> | null>(null)
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, isValidating, mutate, error } = useSWR<AmbulanceAvailabilityOverview>(
    'ambulance-availability',
    () => ambulancesService.getAvailabilityOverview(),
    { refreshInterval: 15000, revalidateOnFocus: true },
  )

  const fetchCrew = useCallback(async () => {
    try {
      const roles = await systemSetupService.getRoles()
      const driverRole = roles.find((r: EmployeeRole) => r.name.toUpperCase().includes('DRIVER'))
      const driverList = driverRole ? await employeesService.getAll(driverRole.id) : []
      setDrivers(driverList)
    } catch {
      /* optional */
    }
  }, [])

  useEffect(() => {
    fetchCrew()
  }, [fetchCrew])

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    try {
      setDetailData(await ambulancesService.getAvailabilityDetail(id))
    } catch {
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetailData(null)
  }

  const handleStatusChange = async (id: string, operational: OperationalAmbulanceStatus) => {
    try {
      setSubmitting(true)
      await ambulancesService.updateStatus(id, DB_STATUS_FOR_OPERATIONAL[operational])
      setStatusModal(null)
      mutate()
      if (detailId === id) openDetail(id)
    } catch {
      alert('Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignDriver = async (ambulanceId: string, driverId: string) => {
    try {
      setSubmitting(true)
      await ambulancesService.assignDriver(ambulanceId, driverId)
      setAssignDriverModal(null)
      mutate()
      fetchCrew()
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || 'Failed to assign driver')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!data?.ambulances) return []
    const q = search.trim().toLowerCase()
    return data.ambulances.filter((row) => {
      if (statusFilter !== 'all' && row.operationalStatus !== statusFilter) return false
      if (regionFilter && row.region?.id !== regionFilter) return false
      if (districtFilter && row.district?.id !== districtFilter) return false
      if (typeFilter && row.vehicleType !== typeFilter) return false
      if (!q) return true
      const hay = [
        row.ambulanceNumber,
        row.plateNumber,
        row.fleetNumber ?? '',
        row.driver?.name ?? '',
        row.currentCase?.trackingCode ?? '',
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [data?.ambulances, search, statusFilter, regionFilter, districtFilter, typeFilter])

  const summary = data?.summary ?? { total: 0, available: 0, unavailable: 0, activeToday: 0 }

  const exportRows = filteredRows.map((r) => ({
    'Ambulance ID': r.ambulanceNumber,
    'Vehicle Number': r.plateNumber,
    Type: r.vehicleType,
    Status: OPERATIONAL_STATUS_CONFIG[r.operationalStatus].label,
    Driver: r.driver?.name ?? '—',
    'Current Case': r.currentCase?.trackingCode ?? '—',
    Region: r.region?.name ?? '—',
    District: r.district?.name ?? '—',
    'Last Updated': format(new Date(r.updatedAt), 'yyyy-MM-dd HH:mm'),
  }))

  const exportCsv = () => {
    if (!exportRows.length) return
    const headers = Object.keys(exportRows[0])
    const csv = [headers.join(','), ...exportRows.map((row) =>
      headers.map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(','),
    )].join('\n')
    downloadBlob(csv, 'text/csv', `ambulance-availability-${today()}.csv`)
  }

  const exportExcel = () => {
    if (!exportRows.length) return
    const headers = Object.keys(exportRows[0])
    const tsv = [headers.join('\t'), ...exportRows.map((row) =>
      headers.map((h) => String(row[h as keyof typeof row])).join('\t'),
    )].join('\n')
    downloadBlob('\uFEFF' + tsv, 'application/vnd.ms-excel', `ambulance-availability-${today()}.xls`)
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
        <p className="text-sm font-semibold">Loading ambulance availability…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6 pb-12 print:p-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl print:hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Truck className="w-32 h-32" /></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">Dispatch Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Ambulance Availability</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Identify dispatch-ready units at a glance. Only ambulances marked Available can receive new case assignments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => mutate()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link href="/admin/ambulances/add">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Add Ambulance
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <FileText className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" /> Failed to load availability data.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Ambulances" value={summary.total} icon={Truck} tone="slate" />
        <KpiCard label="Available" value={summary.available} icon={Truck} tone="emerald" />
        <KpiCard label="Unavailable" value={summary.unavailable} icon={AlertCircle} tone="red" />
        <KpiCard label="Active Today" value={summary.activeToday} icon={Clock} tone="violet" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(Object.keys(OPERATIONAL_STATUS_CONFIG) as OperationalAmbulanceStatus[]).map((key) => {
          const cfg = OPERATIONAL_STATUS_CONFIG[key]
          const count = data?.statusCounts[key] ?? 0
          const desc = key === 'available'
            ? 'Assigned to a driver and not handling a case.'
            : 'No driver assigned, out of service, or already assigned to a case.'
          return (
            <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{cfg.emoji}</span>
                <span className={`text-3xl font-black ${key === 'available' ? 'text-emerald-600' : 'text-red-600'}`}>{count}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 mt-3">{cfg.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          )
        })}
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print:hidden">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Live Ambulance Board</h2>
        <div className="grid lg:grid-cols-3 gap-4">
          <LiveBoardColumn title="Available" rows={data?.liveBoard.available ?? []} status="available" onSelect={openDetail} />
          <LiveBoardColumn title="Unavailable" rows={data?.liveBoard.unavailable ?? []} status="unavailable" onSelect={openDetail} />
          <LiveBoardColumn title="Recently Updated" rows={data?.liveBoard.recentlyUpdated ?? []} status={null} onSelect={openDetail} showTime />
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ambulance ID, vehicle number, driver, case…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          </div>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Regions</option>
            {data?.filters.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Districts</option>
            {data?.filters.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Types</option>
            {data?.filters.ambulanceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setStatusFilter(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800">Ambulance Availability Table</h2>
            <p className="text-xs text-slate-500 mt-0.5">{filteredRows.length} units shown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Ambulance ID</th>
                  <th className="px-4 py-3">Vehicle No.</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Current Case</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-16 text-center text-slate-500">No ambulances match your filters</td></tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold">{row.ambulanceNumber}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{row.plateNumber}</td>
                    <td className="px-4 py-3">{row.vehicleType}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.operationalStatus} /></td>
                    <td className="px-4 py-3">{row.driver?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {row.currentCase ? (
                        <Link href={`/admin/emergency-requests/${row.currentCase.id}`} className="text-blue-600 hover:underline font-semibold">{row.currentCase.trackingCode}</Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{row.region?.name ?? '—'}</td>
                    <td className="px-4 py-3">{row.district?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatTimeAgo(row.updatedAt)}</td>
                    <td className="px-4 py-3 print:hidden">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openDetail(row.id)} className="p-1.5 rounded-lg hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setStatusModal({ id: row.id, ambulanceNumber: row.ambulanceNumber })} className="p-1.5 rounded-lg hover:bg-slate-100"><Activity className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col max-h-[600px] print:hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800">Recent Status Changes</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(data?.recentChanges ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No recent changes</p>
            ) : data!.recentChanges.map((change) => (
              <div key={change.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{change.activity}</p>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{change.actorName}</span>
                  <span>{formatTimeAgo(change.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {data?.analytics && (
        <section className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Analytics</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Ambulance Usage">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.analytics.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" radius={[6, 6, 0, 0]} name="Cases" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Cases Per Ambulance (30 days)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.analytics.casesPerAmbulance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="ambulanceNumber" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Cases" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Available vs Unavailable">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.analytics.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {data.analytics.statusDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ambulance Activity Trend">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.analytics.activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="active" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="Active cases" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>
      )}

      {detailId && (
        <Modal onClose={closeDetail} title={detailData?.ambulance?.ambulanceNumber ?? 'Ambulance Details'}>
          {detailLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" /></div>
          ) : detailData ? (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoField label="Vehicle Number" value={detailData.ambulance.plateNumber} />
                <InfoField label="Type" value={detailData.ambulance.vehicleType ?? '—'} />
                <InfoField label="Current Status"><StatusBadge status={detailData.ambulance.operationalStatus} /></InfoField>
                <InfoField label="Region" value={detailData.ambulance.region?.name ?? '—'} />
                <InfoField label="District" value={detailData.ambulance.district?.name ?? '—'} />
                <InfoField label="Driver" value={detailData.driver ? `${detailData.driver.firstName} ${detailData.driver.lastName}` : '—'} />
              </div>
              {detailData.currentCase && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Current Case</p>
                  <Link href={`/admin/emergency-requests/${detailData.currentCase.id}`} className="text-blue-700 font-bold hover:underline flex items-center gap-1">
                    {detailData.currentCase.trackingCode} <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase mb-2">Case History</h3>
                {detailData.caseHistory?.length ? detailData.caseHistory.map((c: any) => (
                  <Link key={c.id} href={`/admin/emergency-requests/${c.id}`} className="flex justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm mb-1">
                    <span className="font-semibold">{c.trackingCode}</span>
                    <span className="text-xs text-slate-500">{c.status.replace(/_/g, ' ')}</span>
                  </Link>
                )) : <p className="text-sm text-slate-500">No case history</p>}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase mb-2">Status History</h3>
                {detailData.statusHistory?.length ? detailData.statusHistory.map((h: any) => (
                  <div key={h.id} className="text-sm p-2.5 rounded-lg bg-slate-50 mb-1">
                    <p className="font-medium">{h.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(h.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No status history</p>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatusModal({ id: detailData.ambulance.id, ambulanceNumber: detailData.ambulance.ambulanceNumber })}>Change Status</Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAssignDriverModal({ id: detailData.ambulance.id, ambulanceNumber: detailData.ambulance.ambulanceNumber })}><User className="w-4 h-4 mr-1" /> Assign Driver</Button>
                {detailData.currentCase && (
                  <Link href={`/admin/emergency-requests/${detailData.currentCase.id}`}>
                    <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700">View Case <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </Link>
                )}
              </div>
            </div>
          ) : <p className="text-center py-8 text-slate-500">Could not load details</p>}
        </Modal>
      )}

      {statusModal && (
        <Modal onClose={() => setStatusModal(null)} title={`Change Status — ${statusModal.ambulanceNumber}`}>
          <div className="space-y-2">
            {(Object.keys(OPERATIONAL_STATUS_CONFIG) as OperationalAmbulanceStatus[]).map((key) => {
              const cfg = OPERATIONAL_STATUS_CONFIG[key]
              return (
                <button key={key} type="button" disabled={submitting} onClick={() => handleStatusChange(statusModal.id, key)} className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-red-200 hover:bg-red-50 text-left">
                  <span className="text-xl">{cfg.emoji}</span>
                  <div><p className="font-bold">{cfg.label}</p></div>
                </button>
              )
            })}
          </div>
        </Modal>
      )}

      {assignDriverModal && (
        <CrewAssignModal title="Assign Driver" unit={assignDriverModal.ambulanceNumber} crew={drivers.filter((d) => !d.assignedAmbulanceId || d.assignedAmbulanceId === assignDriverModal.id)} onClose={() => setAssignDriverModal(null)} onSelect={(id) => handleAssignDriver(assignDriverModal.id, id)} submitting={submitting} icon={User} />
      )}

    </div>
  )
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Truck; tone: 'slate' | 'emerald' | 'red' | 'blue' | 'violet' }) {
  const colors = { slate: 'text-slate-600 bg-slate-50', emerald: 'text-emerald-600 bg-emerald-50', red: 'text-red-600 bg-red-50', blue: 'text-blue-600 bg-blue-50', violet: 'text-violet-600 bg-violet-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><p className="text-3xl font-black mt-1">{value}</p></div>
      <div className={`p-3 rounded-xl ${colors[tone]}`}><Icon className="w-6 h-6" /></div>
    </div>
  )
}

function StatusBadge({ status }: { status: OperationalAmbulanceStatus }) {
  const cfg = OPERATIONAL_STATUS_CONFIG[status]
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${cfg.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
}

function LiveBoardColumn({ title, rows, status, onSelect, showTime }: { title: string; rows: AmbulanceAvailabilityRow[]; status: OperationalAmbulanceStatus | null; onSelect: (id: string) => void; showTime?: boolean }) {
  const border = status === 'available' ? 'border-emerald-200' : status === 'unavailable' ? 'border-red-200' : 'border-slate-200'
  return (
    <div className={`rounded-xl border ${border} bg-slate-50/50 p-3 min-h-[140px]`}>
      <p className="text-[10px] font-black text-slate-500 uppercase mb-2">{title} ({rows.length})</p>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {rows.length === 0 ? <p className="text-xs text-slate-400 py-4 text-center">None</p> : rows.map((row) => (
          <button key={row.id} type="button" onClick={() => onSelect(row.id)} className="w-full text-left px-2.5 py-2 rounded-lg bg-white border hover:border-red-200 text-xs font-semibold">
            {row.ambulanceNumber}
            {showTime && <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{formatTimeAgo(row.updatedAt)}</span>}
            {!showTime && row.currentCase && <span className="block text-[10px] text-blue-600 mt-0.5">{row.currentCase.trackingCode}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-bold mb-4">{title}</h3>{children}</div>
}

function InfoField({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return <div><p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>{children ?? <p className="text-sm font-semibold mt-1">{value}</p>}</div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 text-white flex justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function CrewAssignModal({ title, unit, crew, onClose, onSelect, submitting, icon: Icon }: { title: string; unit: string; crew: Employee[]; onClose: () => void; onSelect: (id: string) => void; submitting: boolean; icon: typeof User }) {
  return (
    <Modal onClose={onClose} title={`${title} — ${unit}`}>
      <div className="max-h-72 overflow-y-auto space-y-2">
        {crew.length === 0 ? <p className="text-center py-8 text-sm text-slate-500">No available crew</p> : crew.map((m) => (
          <button key={m.id} type="button" disabled={submitting} onClick={() => onSelect(m.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-red-200 hover:bg-red-50 text-left">
            <div className="p-2 rounded-lg bg-red-100 text-red-600"><Icon className="w-4 h-4" /></div>
            <div><p className="text-sm font-bold">{m.firstName} {m.lastName}</p><p className="text-xs text-slate-500">{m.employeeRole?.name}</p></div>
          </button>
        ))}
      </div>
    </Modal>
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
