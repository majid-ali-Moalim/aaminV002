'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart2,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadMultiReportPdf, downloadReportPdf } from '@/lib/reports/exportPdf'
import ReportFiltersBar, { type ReportFilterDef } from '@/components/reports/ReportFiltersBar'
import toast from 'react-hot-toast'

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
  tertiaryTable?: ReportTable
  exportBundles?: { key: string; label: string; rows: number }[]
  reports?: Record<string, ReportData>
  permissions?: string[]
}

type FilterOptions = AdminReportFilterOptions

type FilterDef = ReportFilterDef

const REPORT_LABELS: Record<string, string> = {
  emergency: 'Emergency Reports',
  utilization: 'Ambulance Utilization',
  performance: 'Staff Performance Reports',
  hospitals: 'Hospital Acceptance Reports',
  'response-time': 'Response Time Analysis',
  outcomes: 'Case Outcome Reports',
  'handover-outcomes': 'Handover & Transfer Outcomes',
  export: 'Export PDF / Excel',
}

const FILTERS_BY_TYPE: Record<string, FilterDef[]> = {
  emergency: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'priority', label: 'Priority', source: 'priorities' },
    { key: 'status', label: 'Status', source: 'emergencyStatuses' },
    { key: 'emergencyType', label: 'Category', source: 'incidentCategories' },
    { key: 'transportType', label: 'Transport Type', source: 'transportTypes' },
    { key: 'requestSource', label: 'Request Source', source: 'requestSources' },
    { key: 'hospital', label: 'Hospital', source: 'hospitals' },
    { key: 'ambulance', label: 'Ambulance', source: 'ambulances' },
    { key: 'station', label: 'Station', source: 'stations' },
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
    { key: 'emergencyType', label: 'Category', source: 'incidentCategories' },
    { key: 'requestSource', label: 'Request Source', source: 'requestSources' },
    { key: 'station', label: 'Station', source: 'stations' },
  ],
  outcomes: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'priority', label: 'Priority', source: 'priorities' },
    { key: 'status', label: 'Status', source: 'emergencyStatuses' },
    { key: 'emergencyType', label: 'Category', source: 'incidentCategories' },
    { key: 'hospital', label: 'Hospital', source: 'hospitals' },
    { key: 'transportType', label: 'Transport Type', source: 'transportTypes' },
  ],
  'handover-outcomes': [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
    { key: 'priority', label: 'Priority', source: 'priorities' },
    { key: 'transportType', label: 'Transport Type', source: 'transportTypes' },
    { key: 'patientOutcome', label: 'Handover Status', source: 'patientOutcomes' },
    { key: 'status', label: 'Case Status', source: 'emergencyStatuses' },
  ],
  export: [
    { key: 'region', label: 'Region', source: 'regions' },
    { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
  ],
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
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [filtersError, setFiltersError] = useState('')
  const [soleFilter, setSoleFilter] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [pdfExporting, setPdfExporting] = useState(false)

  useEffect(() => {
    let active = true
    setFiltersLoading(true)
    setFiltersError('')
    getAdminReportFilterOptions()
      .then((data) => {
        if (!active) return
        setFilterOptions(data)
        if (!data.regions.length) {
          setFiltersError('Regions/districts could not be loaded. Check setup data or permissions.')
        }
      })
      .catch(() => {
        if (active) setFiltersError('Failed to load filter options.')
      })
      .finally(() => {
        if (active) setFiltersLoading(false)
      })
    return () => {
      active = false
    }
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

  const searchQuery = search.trim().toLowerCase()

  const summaryHorizontal = useMemo(() => {
    if (!report?.summary?.length) return null
    return {
      title: 'KPI Summary',
      columns: report.summary.map((item) => item.label),
      rows: [
        report.summary.map((item) =>
          item.suffix ? `${item.value}${item.suffix}` : item.value,
        ),
      ],
    }
  }, [report?.summary])

  const exportRows = useMemo(() => {
    const table = report?.table
    if (!table) return []
    const rows = searchQuery
      ? table.rows.filter((row) =>
          row.some((cell) => String(cell ?? '').toLowerCase().includes(searchQuery)),
        )
      : table.rows
    return [table.columns, ...rows]
  }, [searchQuery, report?.table])

  const visibleRows = useMemo(() => exportRows.slice(1), [exportRows])

  const secondaryVisibleRows = useMemo(() => {
    const table = report?.secondaryTable
    if (!table) return []
    if (!searchQuery) return table.rows
    return table.rows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(searchQuery)),
    )
  }, [report?.secondaryTable, searchQuery])

  const tertiaryVisibleRows = useMemo(() => {
    const table = report?.tertiaryTable
    if (!table) return []
    if (!searchQuery) return table.rows
    return table.rows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(searchQuery)),
    )
  }, [report?.tertiaryTable, searchQuery])

  const generateCsvFromVisible = () => {
    const chunks: string[] = []
    if (summaryHorizontal) {
      chunks.push(`"${summaryHorizontal.title}"`)
      chunks.push(summaryHorizontal.columns.map((c) => `"${c}"`).join(','))
      for (const row of summaryHorizontal.rows) {
        chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      }
      chunks.push('')
    }
    if (report?.table) {
      chunks.push(`"${report.table.title}"`)
      chunks.push(report.table.columns.map((c) => `"${c}"`).join(','))
      for (const row of visibleRows) {
        chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      }
      chunks.push('')
    }
    if (report?.secondaryTable) {
      chunks.push(`"${report.secondaryTable.title}"`)
      chunks.push(report.secondaryTable.columns.map((c) => `"${c}"`).join(','))
      for (const row of secondaryVisibleRows) {
        chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      }
      chunks.push('')
    }
    if (report?.tertiaryTable) {
      chunks.push(`"${report.tertiaryTable.title}"`)
      chunks.push(report.tertiaryTable.columns.map((c) => `"${c}"`).join(','))
      for (const row of tertiaryVisibleRows) {
        chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      }
    }
    if (!chunks.length) {
      toast.error('No data to generate')
      return
    }
    downloadText(`${type}-report-${range}.csv`, chunks.join('\n'), 'text/csv')
    toast.success('CSV report generated from this report’s current search/filters')
  }

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

  const downloadPdf = async () => {
    if (!report?.table || pdfExporting) return
    setPdfExporting(true)
    try {
      await downloadReportPdf(
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
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  const downloadExportBundlePdf = async (key: string) => {
    const child = report?.reports?.[key]
    if (!child?.table || pdfExporting) return
    setPdfExporting(true)
    try {
      await downloadReportPdf(
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
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  const downloadAllExportPdf = async () => {
    if (!report?.reports || pdfExporting) return
    setPdfExporting(true)
    try {
      const tables = Object.values(report.reports)
        .filter((r) => r.table)
        .map((r) => r.table!)
      await downloadMultiReportPdf(
        'Aamin EMS — Full Analytics Export',
        report.period?.label ?? range,
        tables,
        `all-reports-${range}.pdf`,
      )
      toast.success('Combined PDF export downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfExporting(false)
    }
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
              onClick={generateCsvFromVisible}
              disabled={!report}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Generate CSV
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!report?.table || pdfExporting}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate PDF
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
                disabled={!report?.reports || pdfExporting}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                All PDF
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="print:hidden space-y-4">
        <ReportFiltersBar
          filterOptions={filterOptions}
          filters={filters}
          setFilters={setFilters}
          filterDefs={activeFilters}
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          soleFilter={soleFilter}
          setSoleFilter={setSoleFilter}
          filtersLoading={filtersLoading}
          filtersError={filtersError}
          permissionLabel={report?.permissions?.join(', ') || 'report.view'}
          onClear={() => {
            setStartDate('')
            setEndDate('')
            setFilters({})
            setSearch('')
          }}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            Search this report only
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records in this report (Destination, Category, Response, patient…)"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {visibleRows.length} matching row(s) in this report
            </p>
          )}
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
          {summaryHorizontal && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-black text-slate-900">{summaryHorizontal.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {summaryHorizontal.columns.length} KPI columns
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-max w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {summaryHorizontal.columns.map((column) => (
                        <th
                          key={column}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 border-r border-slate-100 last:border-r-0"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {summaryHorizontal.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${cellIndex}-${String(cell)}`}
                            className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-800 border-r border-slate-50 last:border-r-0"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                        disabled={pdfExporting}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                      >
                        {pdfExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
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
              hideSearch
            />
          )}

          {report.secondaryTable && (
            <ReportTableSection
              table={report.secondaryTable}
              search=""
              setSearch={() => {}}
              visibleRows={secondaryVisibleRows}
              onRefresh={() => setReloadKey((c) => c + 1)}
              hideSearch
            />
          )}

          {report.tertiaryTable && (
            <ReportTableSection
              table={report.tertiaryTable}
              search=""
              setSearch={() => {}}
              visibleRows={tertiaryVisibleRows}
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
