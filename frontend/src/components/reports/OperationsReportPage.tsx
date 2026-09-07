'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart2,
  Download,
  FileJson,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadOperationsReportPdf } from '@/lib/reports/exportOperationsPdf'
import ReportFiltersBar from '@/components/reports/ReportFiltersBar'

type SummaryItem = { label: string; value: string | number; suffix?: string }
type ReportTable = { title: string; columns: string[]; rows: Array<Array<string | number>> }

type OperationsReport = {
  title: string
  subtitle: string
  period?: { label: string }
  filterScope?: {
    mode: 'filtered' | 'full'
    label: string
    description: string
    containsNote: string
  }
  summary?: SummaryItem[]
  sections?: ReportTable[]
  table?: ReportTable
  permissions?: string[]
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function rowMatches(row: Array<string | number>, q: string) {
  return row.some((cell) => String(cell ?? '').toLowerCase().includes(q))
}

function HorizontalTable({
  table,
  onExport,
}: {
  table: ReportTable
  onExport: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">{table.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {table.columns.length} columns · {table.rows.length} row{table.rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="text-xs font-bold text-red-600 hover:text-red-700"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
              {table.columns.map((col) => (
                <th key={col} className="px-4 py-3 whitespace-nowrap border-r border-slate-100 last:border-r-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length} className="px-4 py-8 text-center text-slate-400">
                  No matching records
                </td>
              </tr>
            ) : (
              table.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap border-r border-slate-50 last:border-r-0"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function OperationsReportPage() {
  const [range, setRange] = useState('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState<OperationsReport | null>(null)
  const [filterOptions, setFilterOptions] = useState<AdminReportFilterOptions | null>(null)
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
    async function load() {
      setLoading(true)
      setError('')
      try {
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v.trim()),
        )
        const data = await getAdminReport('operations', {
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ...cleanFilters,
        })
        if (active) setReport(data as OperationsReport)
      } catch (err: unknown) {
        if (active) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined
          setError(message || 'Failed to load operations report')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [range, startDate, endDate, filters, reloadKey])

  const q = search.trim().toLowerCase()

  const filteredSections = useMemo(() => {
    const sections = report?.sections ?? []
    if (!q) return sections
    return sections
      .map((section) => {
        // Keep horizontal KPI header rows if the section title or any column/value matches
        const headerHit =
          section.title.toLowerCase().includes(q) ||
          section.columns.some((c) => c.toLowerCase().includes(q))
        const rows = section.rows.filter((row) => rowMatches(row, q) || headerHit)
        return { ...section, rows: headerHit && rows.length === 0 ? section.rows : rows }
      })
      .filter((section) => section.rows.length > 0)
  }, [report?.sections, q])

  const mainRows = useMemo(() => {
    const table = report?.table
    if (!table) return []
    return q ? table.rows.filter((row) => rowMatches(row, q)) : table.rows
  }, [report?.table, q])

  const downloadCsv = (table: ReportTable, name: string) => {
    const csv = [table.columns, ...table.rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadText(`${name}-${range}.csv`, csv, 'text/csv')
    toast.success('CSV downloaded')
  }

  const regionName = filterOptions?.regions.find((r) => r.id === filters.region)?.name
  const districtName = filterOptions?.districts.find((d) => d.id === filters.district)?.name

  const generateReport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!report) return
    if (format === 'json') {
      downloadText(`operations-${range}.json`, JSON.stringify(report, null, 2), 'application/json')
      toast.success('JSON report generated')
      return
    }
    if (format === 'csv') {
      const chunks: string[] = []
      for (const section of filteredSections) {
        chunks.push(`"${section.title}"`)
        chunks.push(section.columns.map((c) => `"${c}"`).join(','))
        for (const row of section.rows) {
          chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        }
        chunks.push('')
      }
      if (report.table) {
        chunks.push(`"${report.table.title}"`)
        chunks.push(report.table.columns.map((c) => `"${c}"`).join(','))
        for (const row of mainRows) {
          chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        }
      }
      downloadText(`operations-report-${range}.csv`, chunks.join('\n'), 'text/csv')
      toast.success('CSV report generated from current search/filters')
      return
    }

    const hasData = mainRows.length > 0 || filteredSections.some((s) => s.rows.length > 0)
    if (!hasData) {
      toast.error('No data to generate')
      return
    }
    setPdfExporting(true)
    try {
      await downloadOperationsReportPdf(
        { ...report, sections: filteredSections },
        mainRows,
        {
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          regionName,
          districtName,
          search,
        },
      )
      toast.success('PDF report generated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 print:space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-red-600 p-3">
              <BarChart2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-200">AADS Analytics</p>
              <h1 className="mt-1 text-2xl font-black">{report?.title || 'Operations Intelligence'}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Horizontal KPI columns, full case records, search this report, then generate PDF/CSV.
              </p>
              {report?.period?.label && (
                <p className="mt-2 text-xs font-semibold text-slate-400">Period: {report.period.label}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white outline-none"
            >
              <option className="text-slate-900" value="7d">Last 7 days</option>
              <option className="text-slate-900" value="30d">Last 30 days</option>
              <option className="text-slate-900" value="90d">Last 90 days</option>
              <option className="text-slate-900" value="365d">Last 12 months</option>
            </select>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void generateReport('csv')}
              disabled={!report}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Generate CSV
            </button>
            <button
              type="button"
              onClick={() => void generateReport('pdf')}
              disabled={!report || pdfExporting}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {pdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate PDF
            </button>
            <button
              type="button"
              onClick={() => void generateReport('json')}
              disabled={!report}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold disabled:opacity-50"
            >
              <FileJson className="h-4 w-4" />
              JSON
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Search this report</p>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search only this report’s KPI columns and case records…"
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none focus:border-red-500"
            />
          </div>
          {q && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Showing matches in this report only · {mainRows.length} case row(s) · {filteredSections.length} section(s)
            </p>
          )}
        </div>
      </div>

      <ReportFiltersBar
        filterOptions={filterOptions}
        filters={filters}
        setFilters={setFilters}
        filterDefs={[
          { key: 'region', label: 'Region', source: 'regions' },
          { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
        ]}
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

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-slate-500">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-red-600" />
          Loading operations intelligence…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-bold">Report failed to load</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && report && (
        <>
          {filteredSections.map((section) => (
            <HorizontalTable
              key={section.title}
              table={section}
              onExport={() => downloadCsv(section, section.title.toLowerCase().replace(/\s+/g, '-'))}
            />
          ))}

          {report.table && (
            <HorizontalTable
              table={{
                ...report.table,
                title: q
                  ? `Case records matching search (${mainRows.length})`
                  : `${report.table.title} (${mainRows.length})`,
                rows: mainRows,
              }}
              onExport={() =>
                downloadCsv(
                  { ...report.table!, rows: mainRows },
                  'operations-cases',
                )
              }
            />
          )}
        </>
      )}
    </div>
  )
}
