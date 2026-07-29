'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { displayAttendanceFlag } from '@/lib/availability/labels'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  User,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { driversService } from '@/lib/api'
import {
  type DriverAvailabilityOverview,
  type DriverAvailabilityRow,
  type OperationalDriverStatus,
  type DriverStatusFilterTab,
  DRIVER_STATUS_CONFIG,
  formatTimeAgo,
} from '@/lib/drivers/availability'
import { buildStaffChatUrl } from '@/lib/staffChat'

const STATUS_TABS: { id: DriverStatusFilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Unavailable' },
]

export default function DriverAvailabilityView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilterTab>('all')
  const [stationFilter, setStationFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const { data, isLoading, isValidating, mutate, error } = useSWR<DriverAvailabilityOverview>(
    'driver-availability',
    () => driversService.getAvailabilityOverview(),
    { refreshInterval: 15000, revalidateOnFocus: true },
  )

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    try {
      setDetailData(await driversService.getAvailabilityDetail(id))
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

  const openDriverChat = (row: DriverAvailabilityRow) => {
    if (!row.userId) return
    router.push(
      buildStaffChatUrl({
        userId: row.userId,
        caseId: row.currentCase?.id,
        trackingCode: row.currentCase?.trackingCode,
      }),
    )
  }

  const filteredRows = useMemo(() => {
    if (!data?.drivers) return []
    const q = search.trim().toLowerCase()
    return data.drivers.filter((row) => {
      if (statusFilter !== 'all' && row.operationalStatus !== statusFilter) return false
      if (stationFilter && row.station?.id !== stationFilter) return false
      if (regionFilter && row.region?.id !== regionFilter) return false
      if (districtFilter && row.district?.id !== districtFilter) return false
      if (!q) return true
      const hay = [
        row.fullName,
        row.employeeCode ?? '',
        row.phone ?? '',
        row.currentCase?.trackingCode ?? '',
        row.currentCase?.patientName ?? '',
        row.station?.name ?? '',
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [data?.drivers, search, statusFilter, stationFilter, regionFilter, districtFilter])

  const summary = data?.summary ?? { total: 0, available: 0, unavailable: 0, activeToday: 0 }
  const onCaseCount = useMemo(
    () => (data?.drivers ?? []).filter((d) => d.currentCase).length,
    [data?.drivers],
  )

  const exportRows = filteredRows.map((r) => ({
    'Driver ID': r.employeeCode ?? r.id.slice(0, 8),
    Name: r.fullName,
    Phone: r.phone ?? '—',
    Availability: displayAttendanceFlag(r.attendanceStatus === 'present'),
    Status: DRIVER_STATUS_CONFIG[r.operationalStatus].label,
    'Current Case': r.currentCase?.trackingCode ?? '—',
    Patient: r.currentCase?.patientName ?? '—',
    Ambulance: r.currentCase?.ambulanceNumber ?? '—',
    Station: r.station?.name ?? '—',
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
    downloadBlob(csv, 'text/csv', `driver-availability-${today()}.csv`)
  }

  const exportExcel = () => {
    if (!exportRows.length) return
    const headers = Object.keys(exportRows[0])
    const tsv = [headers.join('\t'), ...exportRows.map((row) =>
      headers.map((h) => String(row[h as keyof typeof row])).join('\t'),
    )].join('\n')
    downloadBlob('\uFEFF' + tsv, 'application/vnd.ms-excel', `driver-availability-${today()}.xls`)
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
        <p className="text-sm font-semibold">Loading driver availability…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6 pb-12 print:p-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl print:hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Users className="w-32 h-32" /></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">Dispatch Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Driver Availability</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Crew marked available today are ready for dispatch; unavailable crew are off the board.
              Message drivers directly when they are on an active case.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => mutate()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link href="/admin/drivers/add">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Add Driver
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
          <AlertCircle className="w-5 h-5 shrink-0" /> Failed to load driver availability data.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Drivers" value={summary.total} icon={Users} tone="slate" />
        <KpiCard label="Available for dispatch" value={summary.available} icon={Users} tone="emerald" />
        <KpiCard label="On Active Case" value={onCaseCount} icon={Truck} tone="violet" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver name, ID, phone, case, patient…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          </div>
          <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Stations</option>
            {data?.filters.stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Regions</option>
            {data?.filters.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            <option value="">All Districts</option>
            {data?.filters.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DriverStatusFilterTab)} className="lg:w-44 px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
            {STATUS_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.id === 'all' ? 'All Statuses' : tab.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-800">Driver Availability Table</h2>
            <p className="text-xs text-slate-500 mt-0.5">{filteredRows.length} drivers shown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Current Case</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Ambulance</th>
                  <th className="px-4 py-3">Station</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-500">No drivers match your filters</td></tr>
                ) : filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold">{row.fullName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{row.employeeCode ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">{row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.operationalStatus} />
                      <p className="text-[10px] text-slate-500 mt-0.5">{displayAttendanceFlag(row.attendanceStatus === 'present')}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.currentCase ? (
                        <Link href={`/admin/emergency-requests/${row.currentCase.id}`} className="text-blue-600 hover:underline font-semibold">{row.currentCase.trackingCode}</Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{row.currentCase?.patientName ?? '—'}</td>
                    <td className="px-4 py-3">{row.currentCase?.ambulanceNumber ?? '—'}</td>
                    <td className="px-4 py-3">{row.station?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatTimeAgo(row.updatedAt)}</td>
                    <td className="px-4 py-3 print:hidden">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openDetail(row.id)} className="p-1.5 rounded-lg hover:bg-slate-100" title="View details"><Eye className="w-4 h-4" /></button>
                        {row.currentCase && row.userId && (
                          <button type="button" onClick={() => openDriverChat(row)} className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50" title="Message driver about case">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
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

      {detailId && (
        <Modal onClose={closeDetail} title={detailData?.driver ? `${detailData.driver.firstName ?? ''} ${detailData.driver.lastName ?? ''}`.trim() : 'Driver Details'}>
          {detailLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" /></div>
          ) : detailData ? (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoField label="Driver ID" value={detailData.driver.employeeCode ?? '—'} />
                <InfoField label="Phone" value={detailData.driver.phone ?? '—'} />
                <InfoField label="Dispatch status"><StatusBadge status={detailData.driver.operationalStatus} /></InfoField>
                <InfoField label="Today's availability" value={displayAttendanceFlag(detailData.driver.attendanceStatus === 'present')} />
                <InfoField label="Station" value={detailData.driver.station?.name ?? '—'} />
                <InfoField label="Region" value={detailData.driver.region?.name ?? '—'} />
                <InfoField label="License" value={detailData.driver.licenseStatus ?? '—'} />
              </div>
              {detailData.currentCase && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Current Case</p>
                  <Link href={`/admin/emergency-requests/${detailData.currentCase.id}`} className="text-blue-700 font-bold hover:underline flex items-center gap-1">
                    {detailData.currentCase.trackingCode} <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  {detailData.currentCase.patient?.fullName && (
                    <p className="text-sm text-slate-700"><User className="w-3.5 h-3.5 inline mr-1" />{detailData.currentCase.patient.fullName}</p>
                  )}
                  {detailData.currentCase.ambulance?.ambulanceNumber && (
                    <p className="text-sm text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1" />{detailData.currentCase.ambulance.ambulanceNumber}</p>
                  )}
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
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {detailData.currentCase && detailData.driver.userId && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => router.push(buildStaffChatUrl({ userId: detailData.driver.userId, caseId: detailData.currentCase.id, trackingCode: detailData.currentCase.trackingCode }))}>
                    <MessageSquare className="w-4 h-4 mr-1" /> Message Driver
                  </Button>
                )}
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
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: 'slate' | 'emerald' | 'red' | 'violet' }) {
  const colors = { slate: 'text-slate-600 bg-slate-50', emerald: 'text-emerald-600 bg-emerald-50', red: 'text-red-600 bg-red-50', violet: 'text-violet-600 bg-violet-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
      <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p><p className="text-3xl font-black mt-1">{value}</p></div>
      <div className={`p-3 rounded-xl ${colors[tone]}`}><Icon className="w-6 h-6" /></div>
    </div>
  )
}

function StatusBadge({ status }: { status: OperationalDriverStatus }) {
  const cfg = DRIVER_STATUS_CONFIG[status]
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${cfg.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
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
