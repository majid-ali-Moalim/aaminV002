'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadMultiReportPdf, downloadReportPdf } from '@/lib/reports/exportPdf'

type SummaryItem = {
  label: string
  value: string | number
  suffix?: string
}

type ReportTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

type ReportData = {
  title: string
  subtitle: string
  period?: { label: string }
  summary?: SummaryItem[]
  table?: ReportTable
  secondaryTable?: ReportTable
  exportBundles?: { key: string; label: string; rows: number }[]
  reports?: Record<string, ReportData>
  permissions?: string[]
}

type FilterOptions = AdminReportFilterOptions

type FilterDef = {
  key: string
  label: string
  source:
    | 'regions'
    | 'districts'
    | 'priorities'
    | 'emergencyStatuses'
    | 'incidentCategories'
    | 'ambulances'
    | 'ambulanceStatuses'
    | 'vehicleTypes'
    | 'employeeRoles'
    | 'hospitals'
  dependsOnRegion?: boolean
}

const REPORT_LABELS: Record<string, string> = {
  emergency: 'Emergency Reports',
  utilization: 'Ambulance Utilization',
  performance: 'Staff Performance Reports',
  hospitals: 'Hospital Acceptance Reports',
  'response-time': 'Response Time Analysis',
  outcomes: 'Case Outcome Reports',
  export: 'Export PDF / Excel',
}

const FILTERS_BY_TYPE: Record<string, FilterDef[]> = {
  emergency: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'priority', label: 'Priority', source: 'priorities' },
    { key: 'status', label: 'Status', source: 'emergencyStatuses' },
    { key: 'emergencyType', label: 'Category', source: 'incidentCategories' },
  ],
  utilization: [
    { key: 'ambulance', label: 'Ambulance', source: 'ambulances' },
    { key: 'ambulanceStatus', label: 'Fleet Status', source: 'ambulanceStatuses' },
    { key: 'vehicleType', label: 'Vehicle Type', source: 'vehicleTypes' },
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
  ],
  performance: [
    { key: 'staffRole', label: 'Staff Role', source: 'employeeRoles' },
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
  ],
  hospitals: [
    { key: 'hospital', label: 'Hospital', source: 'hospitals' },
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
  ],
  'response-time': [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'priority', label: 'Priority', source: 'priorities' },
    { key: 'status', label: 'Status', source: 'emergencyStatuses' },
  ],
  outcomes: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'status', label: 'Status', source: 'emergencyStatuses' },
  ],
  export: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
  ],
}

function getSelectOptions(filter: FilterDef, options: FilterOptions | null, regionId: string) {
  if (!options) return []
  switch (filter.source) {
    case 'regions':
      return options.regions.map((r) => ({ value: r.id, label: r.name }))
    case 'districts':
      return options.districts
        .filter((d) => !filter.dependsOnRegion || !regionId || d.regionId === regionId)
        .map((d) => ({ value: d.id, label: d.name }))
    case 'priorities':
      return options.priorities
    case 'emergencyStatuses':
      return options.emergencyStatuses
    case 'incidentCategories':
      return options.incidentCategories.map((c) => ({ value: c.id, label: c.name }))
    case 'ambulances':
      return options.ambulances.map((a) => ({
        value: a.id,
        label: `${a.ambulanceNumber}${a.plateNumber ? ` (${a.plateNumber})` : ''}`,
      }))
    case 'ambulanceStatuses':
      return options.ambulanceStatuses
    case 'vehicleTypes':
      return options.vehicleTypes
    case 'employeeRoles':
      return options.employeeRoles.map((r) => ({ value: r.id, label: r.name }))
    case 'hospitals':
      return options.hospitals.map((h) => ({ value: h.id, label: h.name }))
    default:
      return []
  }
}

export default function AdminReportPage({ type }: { type: string }) {
  const [range, setRange] = useState('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    getAdminReportFilterOptions().then(setFilterOptions).catch(() => {})
  }, [])

  useEffect(() => {
    let active = true

    async function loadReport() {
      setLoading(true)
      setError('')
      try {
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value.trim()),
        )
        const data = await getAdminReport(type, {
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ...cleanFilters,
        })
        if (active) setReport(data)
      } catch (err: unknown) {
        if (active) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined
          setError(message || 'Failed to load report data')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReport()
    return () => {
      active = false
    }
  }, [type, range, startDate, endDate, filters, reloadKey])

  const heading = report?.title || REPORT_LABELS[type] || 'Analytics Report'
  const activeFilters = FILTERS_BY_TYPE[type] || []

  const exportRows = useMemo(() => {
    const table = report?.table
    if (!table) return []
    const normalizedSearch = search.trim().toLowerCase()
    const rows = normalizedSearch
      ? table.rows.filter((row) =>
          row.some((cell) => String(cell ?? '').toLowerCase().includes(normalizedSearch)),
        )
      : table.rows
    return [table.columns, ...rows]
  }, [search, report?.table])

  const visibleRows = useMemo(() => exportRows.slice(1), [exportRows])

  const downloadCsv = (name = type, rows = exportRows) => {
    if (!rows.length) return
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    downloadText(`${name}-${range}.csv`, csv, 'text/csv')
  }

  const downloadJson = (name = type, data: unknown = report) => {
    downloadText(`${name}-${range}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  const downloadPdf = () => {
    if (!report?.table) return
    downloadReportPdf(
      {
        title: report.title,
        subtitle: report.subtitle,
        periodLabel: report.period?.label,
        summary: report.summary,
        table: {
          ...report.table,
          rows: visibleRows,
        },
        secondaryTable: report.secondaryTable
          ? { ...report.secondaryTable }
          : undefined,
      },
      `${type}-${range}.pdf`,
    )
  }

  const downloadExportBundlePdf = (key: string) => {
    const child = report?.reports?.[key]
    if (!child?.table) return
    downloadReportPdf(
      {
        title: child.title,
        subtitle: child.subtitle,
        periodLabel: child.period?.label,
        summary: child.summary,
        table: child.table,
        secondaryTable: child.secondaryTable,
      },
      `${key}-${range}.pdf`,
    )
  }

  const downloadAllExportPdf = () => {
    if (!report?.reports) return
    const tables = Object.values(report.reports)
      .filter((r) => r.table)
      .map((r) => r.table!)
    downloadMultiReportPdf(
      'Aamin EMS — Full Analytics Export',
      report.period?.label ?? range,
      tables,
      `all-reports-${range}.pdf`,
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-xl print:bg-white print:text-black print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-red-600 p-3 shadow-lg shadow-red-950/30 print:hidden">
              <BarChart2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-200 print:text-red-700">
                Analytics & Reports
              </p>
              <h1 className="mt-1 text-2xl font-black">{heading}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 print:text-slate-600">
                {report?.subtitle || 'Operational data report with export options.'}
              </p>
              {report?.period?.label && (
                <p className="mt-2 text-xs font-semibold text-slate-400 print:text-slate-500">
                  Period: {report.period.label}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white outline-none"
            >
              <option className="text-slate-900" value="7d">Last 7 days</option>
              <option className="text-slate-900" value="30d">Last 30 days</option>
              <option className="text-slate-900" value="90d">Last 90 days</option>
              <option className="text-slate-900" value="365d">Last 12 months</option>
            </select>
            <button
              type="button"
              onClick={() => downloadCsv()}
              disabled={!report?.table}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!report?.table}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => downloadJson()}
              disabled={!report}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileJson className="h-4 w-4" />
              JSON
            </button>
            {type === 'export' && (
              <button
                type="button"
                onClick={downloadAllExportPdf}
                disabled={!report?.reports}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                All PDF
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Filters</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Report Controls</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
              />
            </label>
            {activeFilters.map((filter) => {
              const options = getSelectOptions(filter, filterOptions, filters.region || '')
              return (
                <label key={filter.key} className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {filter.label}
                  </span>
                  <select
                    value={filters[filter.key] || ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setFilters((current) => {
                        const next = { ...current, [filter.key]: value }
                        if (filter.key === 'region') next.district = ''
                        return next
                      })
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
                  >
                    <option value="">All {filter.label}s</option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setFilters({})
                setSearch('')
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Clear Filters
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Permission: {report?.permissions?.join(', ') || 'report.view'}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500 shadow-sm">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-red-600" />
          Loading report data...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold">Report failed to load</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && report && (
        <>
          {!!report.summary?.length && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {report.summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <Activity className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-950">
                    {item.value}
                    {item.suffix && <span className="ml-1 text-sm text-slate-500">{item.suffix}</span>}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {type === 'export' && report.exportBundles && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
              <h2 className="text-lg font-black text-slate-900">Export Center</h2>
              <p className="mt-1 text-sm text-slate-500">Download each report bundle as CSV, JSON, or PDF.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {report.exportBundles.map((bundle) => (
                  <div key={bundle.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">{bundle.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{bundle.rows} rows</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const child = report.reports?.[bundle.key]
                          if (child?.table) downloadCsv(bundle.key, [child.table.columns, ...child.table.rows])
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadJson(bundle.key, report.reports?.[bundle.key])}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadExportBundlePdf(bundle.key)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.table && (
            <ReportTableSection
              table={report.table}
              search={search}
              setSearch={setSearch}
              visibleRows={visibleRows}
              onRefresh={() => setReloadKey((c) => c + 1)}
            />
          )}

          {report.secondaryTable && (
            <ReportTableSection
              table={report.secondaryTable}
              search=""
              setSearch={() => {}}
              visibleRows={report.secondaryTable.rows}
              onRefresh={() => setReloadKey((c) => c + 1)}
              hideSearch
            />
          )}
        </>
      )}
    </div>
  )
}

function ReportTableSection({
  table,
  search,
  setSearch,
  visibleRows,
  onRefresh,
  hideSearch,
}: {
  table: ReportTable
  search: string
  setSearch: (v: string) => void
  visibleRows: Array<Array<string | number>>
  onRefresh: () => void
  hideSearch?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">{table.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{visibleRows.length} records</p>
        </div>
        {!hideSearch && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search table..."
                className="h-10 rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
              />
            </label>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${String(row[0])}`} className="hover:bg-slate-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cellIndex}-${String(cell)}`}
                    className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={table.columns.length}>
                  No records found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
