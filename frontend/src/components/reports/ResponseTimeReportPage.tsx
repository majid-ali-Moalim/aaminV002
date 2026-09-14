'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Download,
  FileJson,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadReportPdf, downloadSectionPdf } from '@/lib/reports/exportPdf'
import ReportFiltersBar from '@/components/reports/ReportFiltersBar'
import ReportSectionTable from '@/components/reports/ReportSectionTable'

type SummaryItem = { label: string; value: string | number; suffix?: string }
type ReportTable = { title: string; columns: string[]; rows: Array<Array<string | number>> }

type ResponseTimeReport = {
  title: string
  subtitle: string
  period?: { label: string }
  filterScope?: { label: string; description?: string; containsNote?: string }
  summary?: SummaryItem[]
  table?: ReportTable
  secondaryTable?: ReportTable
  tertiaryTable?: ReportTable
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

export default function ResponseTimeReportPage() {
  const { user } = useAuth()
  const [range, setRange] = useState('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ResponseTimeReport | null>(null)
  const [filterOptions, setFilterOptions] = useState<AdminReportFilterOptions | null>(null)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [filtersError, setFiltersError] = useState('')
  const [soleFilter, setSoleFilter] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(false)

  const generatedBy =
    user?.username || user?.email || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined

  useEffect(() => {
    let active = true
    setFiltersLoading(true)
    getAdminReportFilterOptions()
      .then((data) => {
        if (!active) return
        setFilterOptions(data)
        if (!data.regions.length) {
          setFiltersError('Regions/districts could not be loaded.')
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
        const data = await getAdminReport('response-time', {
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ...cleanFilters,
        })
        if (active) setReport(data as ResponseTimeReport)
      } catch (err: unknown) {
        if (active) {
          const message =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined
          setError(message || 'Failed to load response time report')
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

  const mainRows = useMemo(() => {
    const table = report?.table
    if (!table) return []
    return q ? table.rows.filter((row) => rowMatches(row, q)) : table.rows
  }, [report?.table, q])

  const secondaryRows = useMemo(() => {
    const table = report?.secondaryTable
    if (!table) return []
    return q ? table.rows.filter((row) => rowMatches(row, q)) : table.rows
  }, [report?.secondaryTable, q])

  const tertiaryRows = useMemo(() => {
    const table = report?.tertiaryTable
    if (!table) return []
    return q ? table.rows.filter((row) => rowMatches(row, q)) : table.rows
  }, [report?.tertiaryTable, q])

  const kpiSection = useMemo((): ReportTable | null => {
    if (!report?.summary?.length) return null
    return {
      title: 'Performance KPIs',
      columns: report.summary.map((s) => s.label),
      rows: [
        report.summary.map((s) => (s.suffix ? `${s.value}${s.suffix}` : s.value)),
      ],
    }
  }, [report?.summary])

  const pdfBase = {
    title: report?.title || 'Response Time Analysis',
    subtitle: report?.subtitle,
    periodLabel: report?.period?.label,
    generatedBy,
    scopeNote: report?.filterScope?.containsNote || report?.filterScope?.description,
    includeSummary: includeExecutiveSummary,
    summary: includeExecutiveSummary ? report?.summary : undefined,
  }

  const generateReport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!report) return
    if (format === 'json') {
      downloadText(`response-time-${range}.json`, JSON.stringify(report, null, 2), 'application/json')
      toast.success('JSON report generated')
      return
    }
    if (format === 'csv') {
      const chunks: string[] = []
      if (kpiSection) {
        chunks.push(`"${kpiSection.title}"`)
        chunks.push(kpiSection.columns.map((c) => `"${c}"`).join(','))
        for (const row of kpiSection.rows) {
          chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        }
        chunks.push('')
      }
      for (const table of [
        report.table ? { ...report.table, rows: mainRows } : null,
        report.secondaryTable ? { ...report.secondaryTable, rows: secondaryRows } : null,
        report.tertiaryTable ? { ...report.tertiaryTable, rows: tertiaryRows } : null,
      ].filter(Boolean) as ReportTable[]) {
        chunks.push(`"${table.title}"`)
        chunks.push(table.columns.map((c) => `"${c}"`).join(','))
        for (const row of table.rows) {
          chunks.push(row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        }
        chunks.push('')
      }
      downloadText(`response-time-${range}.csv`, chunks.join('\n'), 'text/csv')
      toast.success('CSV report generated')
      return
    }

    if (!mainRows.length && !secondaryRows.length && !tertiaryRows.length) {
      toast.error('No data to generate')
      return
    }
    setPdfExporting(true)
    try {
      await downloadReportPdf(
        {
          ...pdfBase,
          table: report.table ? { ...report.table, rows: mainRows } : undefined,
          secondaryTable: report.secondaryTable
            ? { ...report.secondaryTable, rows: secondaryRows }
            : undefined,
        },
        `response-time-${range}.pdf`,
      )
      toast.success('PDF report generated')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-teal-600 p-3">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-200">AADS Analytics</p>
              <h1 className="mt-1 text-2xl font-black">{report?.title || 'Response Time Analysis'}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                {report?.subtitle ||
                  'Operational response and service-time performance with regional breakdown and lifecycle metrics.'}
              </p>
              {report?.period?.label && (
                <p className="mt-2 text-xs font-semibold text-slate-400">Period: {report.period.label}</p>
              )}
              {report?.filterScope?.label && (
                <p className="mt-1 text-xs text-teal-200/80">{report.filterScope.label}</p>
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
              CSV
            </button>
            <button
              type="button"
              onClick={() => void generateReport('pdf')}
              disabled={!report || pdfExporting}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {pdfExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF
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
              placeholder="Search cases, regions, statuses…"
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={includeExecutiveSummary}
            onChange={(e) => setIncludeExecutiveSummary(e.target.checked)}
            className="rounded border-slate-300"
          />
          Include executive summary in PDF exports
        </label>
      </div>

      <ReportFiltersBar
        filterOptions={filterOptions}
        filters={filters}
        setFilters={setFilters}
        filterDefs={[
          { key: 'region', label: 'Region', source: 'regions' },
          { key: 'district', label: 'District', source: 'districts', dependsOnRegion: true },
          { key: 'priority', label: 'Priority', source: 'priorities' },
          { key: 'status', label: 'Status', source: 'emergencyStatuses' },
          { key: 'requestSource', label: 'Request Source', source: 'requestSources' },
          { key: 'station', label: 'Station', source: 'stations' },
        ]}
        startDate={startDate}
        endDate={endDate}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        soleFilter={soleFilter}
        setSoleFilter={setSoleFilter}
        filtersLoading={filtersLoading}
        filtersError={filtersError}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {loading && !report ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading response time data…
        </div>
      ) : (
        <>
          {kpiSection && (
            <ReportSectionTable
              table={kpiSection}
              onExportCsv={() => {
                const csv = [kpiSection.columns, ...kpiSection.rows]
                  .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
                  .join('\n')
                downloadText(`response-time-kpis-${range}.csv`, csv, 'text/csv')
              }}
              onExportPdf={async () => {
                setPdfExporting(true)
                try {
                  await downloadSectionPdf(pdfBase, kpiSection, `response-time-kpis-${range}.pdf`)
                  toast.success('KPI PDF downloaded')
                } catch {
                  toast.error('PDF export failed')
                } finally {
                  setPdfExporting(false)
                }
              }}
            />
          )}

          {report?.table && (
            <ReportSectionTable
              table={{ ...report.table, rows: mainRows }}
              onExportCsv={() => {
                const csv = [report.table!.columns, ...mainRows]
                  .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
                  .join('\n')
                downloadText(`response-time-cases-${range}.csv`, csv, 'text/csv')
              }}
              onExportPdf={async () => {
                setPdfExporting(true)
                try {
                  await downloadSectionPdf(
                    pdfBase,
                    { ...report.table!, rows: mainRows },
                    `response-time-cases-${range}.pdf`,
                  )
                  toast.success('Case detail PDF downloaded')
                } catch {
                  toast.error('PDF export failed')
                } finally {
                  setPdfExporting(false)
                }
              }}
            />
          )}

          {report?.secondaryTable && (
            <ReportSectionTable
              table={{ ...report.secondaryTable, rows: secondaryRows }}
              onExportCsv={() => {
                const csv = [report.secondaryTable!.columns, ...secondaryRows]
                  .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
                  .join('\n')
                downloadText(`response-time-status-${range}.csv`, csv, 'text/csv')
              }}
              onExportPdf={async () => {
                setPdfExporting(true)
                try {
                  await downloadSectionPdf(
                    pdfBase,
                    { ...report.secondaryTable!, rows: secondaryRows },
                    `response-time-status-${range}.pdf`,
                  )
                  toast.success('Status breakdown PDF downloaded')
                } catch {
                  toast.error('PDF export failed')
                } finally {
                  setPdfExporting(false)
                }
              }}
            />
          )}

          {report?.tertiaryTable && (
            <ReportSectionTable
              table={{ ...report.tertiaryTable, rows: tertiaryRows }}
              onExportCsv={() => {
                const csv = [report.tertiaryTable!.columns, ...tertiaryRows]
                  .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
                  .join('\n')
                downloadText(`response-time-regional-${range}.csv`, csv, 'text/csv')
              }}
              onExportPdf={async () => {
                setPdfExporting(true)
                try {
                  await downloadSectionPdf(
                    pdfBase,
                    { ...report.tertiaryTable!, rows: tertiaryRows },
                    `response-time-regional-${range}.pdf`,
                  )
                  toast.success('Regional summary PDF downloaded')
                } catch {
                  toast.error('PDF export failed')
                } finally {
                  setPdfExporting(false)
                }
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
