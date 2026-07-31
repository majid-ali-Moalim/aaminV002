'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  BarChart2,
  Map as MapIcon,
  LayoutGrid,
  Building2,
  ArrowLeftRight,
  Loader2,
  RefreshCw,
  Download,
  Search,
  Filter,
  Plus,
  FileText,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { stationsApi } from '@/lib/stationsApi'
import StationCoverageMapView from '@/components/features/stations/StationCoverageMapView'
import {
  DEFAULT_STATION_REPORT_FILTERS,
  filterStations,
  filterTransfers,
  buildFilterDescription,
  isFiltersActive,
  computeTransferAnalytics,
  computeStationTransferStats,
  STATION_TRANSFER_REASONS,
  CASE_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  type StationReportFilters,
  type StationRow,
  type TransferRow,
} from '@/lib/stations/stationReportsFilters'
import { downloadStationReportsPdf } from '@/lib/stations/exportStationReportsPdf'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'stations', label: 'Station Breakdown', icon: Building2 },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'coverage', label: 'Coverage Map', icon: MapIcon },
] as const

type TabId = (typeof TABS)[number]['id']

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const content = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ReportFiltersBar({
  filters,
  onChange,
  onReset,
  stations,
  regions,
  showTransferFilters,
}: {
  filters: StationReportFilters
  onChange: (next: StationReportFilters) => void
  onReset: () => void
  stations: StationRow[]
  regions: { id: string; name: string }[]
  showTransferFilters?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-700">
        <Filter className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-bold">Report filters</h3>
        {isFiltersActive(filters) && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700">
            Filters active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm"
            placeholder="Search station, case, route, reason..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={filters.stationId}
          onChange={(e) => onChange({ ...filters, stationId: e.target.value })}
        >
          <option value="">All stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={filters.regionId}
          onChange={(e) => onChange({ ...filters, regionId: e.target.value })}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={filters.statusFilter}
          onChange={(e) =>
            onChange({ ...filters, statusFilter: e.target.value as StationReportFilters['statusFilter'] })
          }
        >
          <option value="all">All station status</option>
          <option value="active">Active stations</option>
          <option value="inactive">Inactive stations</option>
        </select>

        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={filters.dateRange}
          onChange={(e) =>
            onChange({ ...filters, dateRange: e.target.value as StationReportFilters['dateRange'] })
          }
        >
          <option value="all">All dates</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>

        {filters.dateRange === 'custom' && (
          <>
            <input
              type="date"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            />
            <input
              type="date"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.endDate}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            />
          </>
        )}

        {showTransferFilters && (
          <>
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.transferDirection}
              onChange={(e) =>
                onChange({
                  ...filters,
                  transferDirection: e.target.value as StationReportFilters['transferDirection'],
                })
              }
            >
              <option value="all">All transfer flow</option>
              <option value="out">Sent out from station</option>
              <option value="in">Received into station</option>
            </select>

            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.transferReason}
              onChange={(e) => onChange({ ...filters, transferReason: e.target.value })}
            >
              <option value="">All transfer reasons</option>
              {STATION_TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.caseStatus}
              onChange={(e) => onChange({ ...filters, caseStatus: e.target.value })}
            >
              <option value="">All case statuses</option>
              {CASE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={filters.priority}
              onChange={(e) => onChange({ ...filters, priority: e.target.value })}
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs text-slate-500">{buildFilterDescription(filters, stations)}</p>
        {isFiltersActive(filters) && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

export default function StationReportsView() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId | null) ?? 'overview'
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'overview',
  )
  const [filters, setFilters] = useState<StationReportFilters>(DEFAULT_STATION_REPORT_FILTERS)
  const [pdfExporting, setPdfExporting] = useState(false)

  const { data, isLoading, mutate, isValidating } = useSWR('stations-full-reports', () =>
    stationsApi.getFullReports(),
  )

  useEffect(() => {
    const next = searchParams.get('tab') as TabId | null
    if (next && TABS.some((t) => t.id === next)) setTab(next)
  }, [searchParams])

  const stations = (data?.stations ?? []) as StationRow[]
  const transfers = (data?.transfers ?? []) as TransferRow[]

  const regions = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of stations) {
      if (s.region?.id && s.region.name) map.set(s.region.id, s.region.name)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [stations])

  const filteredStations = useMemo(() => filterStations(stations, filters), [stations, filters])
  const filteredTransfers = useMemo(() => filterTransfers(transfers, filters), [transfers, filters])
  const transferAnalytics = useMemo(
    () =>
      isFiltersActive(filters)
        ? computeTransferAnalytics(filteredTransfers, stations)
        : data?.transferAnalytics ?? computeTransferAnalytics(filteredTransfers, stations),
    [filters, filteredTransfers, stations, data?.transferAnalytics],
  )

  const cards = data?.overview?.cards ?? {}
  const charts = data?.overview?.charts ?? {}
  const performance = data?.performance ?? {}
  const cases = performance.cases ?? {}
  const transfersKpi = performance.transfers ?? {}
  const coverage = data?.coverage ?? {}

  const handleExportCsv = () => {
    if (tab === 'transfers') {
      exportCsv(
        'station-transfers.csv',
        ['Case', 'Priority', 'From', 'To', 'Reason', 'By', 'Date', 'Status'],
        filteredTransfers.map((t) => [
          t.trackingCode ?? '',
          t.priority ?? '',
          t.fromStation?.name ?? '',
          t.toStation?.name ?? '',
          t.reason ?? '',
          t.transferredBy ?? '',
          t.transferredAt ? format(new Date(t.transferredAt), 'yyyy-MM-dd HH:mm') : '',
          t.caseStatus ?? '',
        ]),
      )
      return
    }

    exportCsv(
      'station-breakdown.csv',
      ['Code', 'Name', 'Region', 'District', 'Ambulances', 'Staff', 'Active Cases', 'Transfers In', 'Transfers Out', 'Status'],
      filteredStations.map((s) => {
        const stats = computeStationTransferStats(filteredTransfers, s.id)
        return [
          s.code ?? '',
          s.name,
          s.region?.name ?? '',
          s.homeDistrict?.name ?? '',
          String(s.counts?.ambulances ?? 0),
          String((s.counts?.drivers ?? 0) + (s.counts?.nurses ?? 0) + (s.counts?.dispatchers ?? 0)),
          String(s.counts?.activeCases ?? 0),
          String(stats.transfersIn),
          String(stats.transfersOut),
          s.isActive ? 'Active' : 'Inactive',
        ]
      }),
    )
  }

  const handleExportPdf = async () => {
    if (pdfExporting) return
    setPdfExporting(true)
    try {
      await downloadStationReportsPdf({
        tab: tab === 'coverage' || tab === 'performance' ? 'all' : tab,
        filters,
        stations,
        filteredStations,
        filteredTransfers,
        transferAnalytics,
        overview: { cards, cases, transfersKpi },
      })
      toast.success('PDF report downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF export failed')
    } finally {
      setPdfExporting(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">Analytics</p>
          <h1 className="text-2xl font-black text-slate-900">Reports & Coverage</h1>
          <p className="text-sm text-slate-500 mt-1">
            Full station reports — operations, transfers in/out, routes, reasons, and coverage.
          </p>
          {data?.generatedAt && (
            <p className="text-[10px] text-slate-400 mt-1">
              Generated {format(new Date(data.generatedAt), 'MMM d, yyyy HH:mm')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="rounded-xl" onClick={() => void handleExportPdf()} disabled={pdfExporting}>
            {pdfExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Export PDF
          </Button>
          <Link href="/admin/stations/manage?add=1">
            <Button variant="outline" className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add Station
            </Button>
          </Link>
        </div>
      </div>

      <ReportFiltersBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_STATION_REPORT_FILTERS)}
        stations={stations}
        regions={regions}
        showTransferFilters={tab === 'transfers' || tab === 'overview' || tab === 'stations'}
      />

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {(tab === 'overview' || tab === 'transfers') && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-bold uppercase text-slate-400">Filtered transfers</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{filteredTransfers.length}</p>
            <p className="text-xs text-slate-500 mt-1">of {transfers.length} total loaded</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 md:col-span-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Top transfer reasons</p>
            <div className="flex flex-wrap gap-2">
              {(transferAnalytics.byReason ?? []).slice(0, 6).map((r: { reason: string; count: number }) => (
                <span
                  key={r.reason}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
                >
                  {r.reason}: {r.count}
                </span>
              ))}
              {!transferAnalytics.byReason?.length && (
                <span className="text-sm text-slate-400">No transfers in current filter</span>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: 'Stations (filtered)', value: filteredStations.length },
              { label: 'Total Stations', value: cards.totalStations ?? 0 },
              { label: 'Active Stations', value: cards.activeStations ?? 0 },
              { label: 'Total Ambulances', value: cards.totalAmbulances ?? 0 },
              { label: 'Available Ambulances', value: cards.availableAmbulances ?? 0 },
              { label: 'Busy Ambulances', value: cards.busyAmbulances ?? 0 },
              { label: 'Drivers', value: cards.drivers ?? 0 },
              { label: 'Nurses', value: cards.nurses ?? 0 },
              { label: 'Active Cases', value: cards.activeCases ?? 0 },
              { label: 'Pending Cases', value: cards.pendingCases ?? 0 },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Transfers by station</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2">Station</th>
                      <th className="text-center px-4 py-2">In</th>
                      <th className="text-center px-4 py-2">Out</th>
                      <th className="text-center px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(transferAnalytics.byStation ?? []).slice(0, 10).map((r: {
                      stationId: string
                      stationName: string
                      transfersIn: number
                      transfersOut: number
                      total: number
                    }) => (
                      <tr key={r.stationId}>
                        <td className="px-4 py-2 font-semibold">{r.stationName}</td>
                        <td className="px-4 py-2 text-center text-emerald-700 font-bold">{r.transfersIn}</td>
                        <td className="px-4 py-2 text-center text-amber-700 font-bold">{r.transfersOut}</td>
                        <td className="px-4 py-2 text-center">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Top transfer routes</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {(transferAnalytics.topRoutes ?? []).length === 0 ? (
                  <p className="p-6 text-sm text-slate-400">No routes in current filter.</p>
                ) : (
                  transferAnalytics.topRoutes.map((r: { from: string; to: string; count: number }, i: number) => (
                    <div key={`${r.from}-${r.to}-${i}`} className="px-5 py-3 flex justify-between gap-3">
                      <span className="text-sm text-slate-700">
                        {r.from} → {r.to}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700">
                        {r.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cases Today</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{charts.casesToday ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transfers Today</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{charts.transfersToday ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completion Rate</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{cases.completionRate ?? 0}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Coverage Gaps</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{coverage.uncoveredCount ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'stations' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3">Region / District</th>
                <th className="text-center px-4 py-3">Fleet</th>
                <th className="text-center px-4 py-3">Staff</th>
                <th className="text-center px-4 py-3">Active Cases</th>
                <th className="text-center px-4 py-3">Transfers In</th>
                <th className="text-center px-4 py-3">Transfers Out</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStations.map((s) => {
                const stats = computeStationTransferStats(filteredTransfers, s.id)
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{s.code || '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/stations/${s.id}`} className="font-bold text-teal-700 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.region?.name ?? '—'} · {s.homeDistrict?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{s.counts?.ambulances ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {(s.counts?.drivers ?? 0) + (s.counts?.nurses ?? 0) + (s.counts?.dispatchers ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{s.counts?.activeCases ?? 0}</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-bold">{stats.transfersIn}</td>
                    <td className="px-4 py-3 text-center text-amber-700 font-bold">{stats.transfersOut}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                          s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredStations.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">No stations match filters</p>
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Station transfer summary</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(transferAnalytics.byStation ?? []).map((r: {
                  stationId: string
                  stationName: string
                  transfersIn: number
                  transfersOut: number
                  total: number
                }) => (
                  <div key={r.stationId} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="font-semibold">{r.stationName}</span>
                    <span className="text-xs text-slate-600">
                      <span className="text-emerald-700 font-bold">{r.transfersIn} in</span>
                      {' · '}
                      <span className="text-amber-700 font-bold">{r.transfersOut} out</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">What they transfer (reasons)</h3>
              <div className="space-y-2">
                {(transferAnalytics.byReason ?? []).map((r: { reason: string; count: number }) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{r.reason}</span>
                    <span className="font-bold text-slate-900">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Case</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">From → To</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">By</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{t.trackingCode ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-slate-100">
                        {t.priority ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-amber-700 font-semibold">{t.fromStation?.name ?? '—'}</span>
                      {' → '}
                      <span className="text-emerald-700 font-semibold">{t.toStation?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.reason ?? '—'}</td>
                    <td className="px-4 py-3">{t.transferredBy ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {t.transferredAt ? format(new Date(t.transferredAt), 'MMM d, yyyy HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                        {t.caseStatus ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransfers.length === 0 && (
              <p className="text-center py-12 text-slate-400 text-sm">No transfers match filters</p>
            )}
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Cases', value: cases.total ?? 0 },
              { label: 'Completed', value: cases.completed ?? 0 },
              { label: 'Cancelled', value: cases.cancelled ?? 0 },
              { label: 'Completion Rate', value: `${cases.completionRate ?? 0}%` },
              { label: 'Transfers In', value: transfersKpi.in ?? 0 },
              { label: 'Transfers Out', value: transfersKpi.out ?? 0 },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <BarChart2 className="w-4 h-4" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800">Performance by station (filtered set)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Station</th>
                  <th className="text-center px-4 py-3">Ambulances</th>
                  <th className="text-center px-4 py-3">Active Cases</th>
                  <th className="text-center px-4 py-3">Transfers</th>
                  <th className="text-center px-4 py-3">Load Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...filteredStations]
                  .sort((a, b) => (b.counts?.activeCases ?? 0) - (a.counts?.activeCases ?? 0))
                  .map((s) => {
                    const amb = s.counts?.ambulances ?? 0
                    const active = s.counts?.activeCases ?? 0
                    const loadIndex = amb > 0 ? Math.round((active / amb) * 100) : active > 0 ? 100 : 0
                    const tStats = computeStationTransferStats(filteredTransfers, s.id)
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-semibold">{s.name}</td>
                        <td className="px-4 py-3 text-center">{amb}</td>
                        <td className="px-4 py-3 text-center font-bold">{active}</td>
                        <td className="px-4 py-3 text-center text-xs">
                          {tStats.transfersIn} in / {tStats.transfersOut} out
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                              loadIndex >= 80
                                ? 'bg-red-50 text-red-700'
                                : loadIndex >= 50
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {loadIndex}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'coverage' && <StationCoverageMapView embedded />}
    </div>
  )
}
