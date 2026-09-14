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
import { useAuth } from '@/context/AuthContext'
import { emergencyRequestsService } from '@/lib/api'
import { downloadPatientCasesReportPdf } from '@/lib/patients/exportPatientCasesPdf'
import type { EmergencyRequest } from '@/types'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadOperationsReportPdf } from '@/lib/reports/exportOperationsPdf'
import { downloadSectionPdf } from '@/lib/reports/exportPdf'
import ReportFiltersBar from '@/components/reports/ReportFiltersBar'
import ReportSectionTable from '@/components/reports/ReportSectionTable'
import RankingDetailModal from '@/components/reports/RankingDetailModal'
import {
  filterCasesByRanking,
  resolveRankingFilter,
  TOP_TEN_COLUMN_LABELS,
  type ReportCaseTable,
} from '@/lib/reports/reportRankingUtils'

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

export default function OperationsReportPage() {
  const { user } = useAuth()
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
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(false)
  const [rankingModal, setRankingModal] = useState<{
    title: string
    subtitle?: string
    detail: ReportCaseTable | null
  } | null>(null)
  const [selectedCaseRows, setSelectedCaseRows] = useState<Set<number>>(new Set())
  const [selectedCasesPdfLoading, setSelectedCasesPdfLoading] = useState(false)

  const generatedBy =
    user?.username || user?.email || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined

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

  useEffect(() => {
    setSelectedCaseRows(new Set())
  }, [mainRows, report?.table?.title])

  const trackingCodeColumnIndex = useMemo(() => {
    const cols = report?.table?.columns ?? []
    const idx = cols.findIndex((c) => c.toLowerCase().includes('tracking'))
    return idx >= 0 ? idx : 0
  }, [report?.table?.columns])

  const exportSelectedCasesDossier = async () => {
    if (!selectedCaseRows.size || !report?.table) {
      toast.error('Select at least one case')
      return
    }
    const codes = [...selectedCaseRows]
      .map((idx) => String(mainRows[idx]?.[trackingCodeColumnIndex] ?? '').trim())
      .filter(Boolean)
    if (!codes.length) {
      toast.error('Could not read tracking codes from selected rows')
      return
    }
    setSelectedCasesPdfLoading(true)
    const toastId = toast.loading(`Building dossier for ${codes.length} case(s)…`)
    try {
      const fetched = await Promise.all(
        codes.map(async (code) => {
          try {
            return (await emergencyRequestsService.getByTrackingCode(code)) as EmergencyRequest
          } catch {
            return null
          }
        }),
      )
      const cases = fetched.filter((c): c is EmergencyRequest => c != null)
      if (!cases.length) {
        toast.error('Could not load case details for selected rows', { id: toastId })
        return
      }
      await downloadPatientCasesReportPdf(cases, {
        search: search || undefined,
      })
      toast.success(`PDF dossier downloaded (${cases.length} case(s))`, { id: toastId })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF', { id: toastId })
    } finally {
      setSelectedCasesPdfLoading(false)
    }
  }

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
          generatedBy,
          includeExecutiveSummary,
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
          { key: 'requestSource', label: 'Request source', source: 'requestSources' },
          { key: 'transportType', label: 'Transport type', source: 'transportTypes' },
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
        includeExecutiveSummary={includeExecutiveSummary}
        setIncludeExecutiveSummary={setIncludeExecutiveSummary}
        onClear={() => {
          setStartDate('')
          setEndDate('')
          setFilters({})
          setSearch('')
          setIncludeExecutiveSummary(false)
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
          {includeExecutiveSummary && report.summary && report.summary.length > 0 && (
            <ReportSectionTable
              table={{
                title: 'Executive Summary',
                columns: report.summary.map((s) => s.label),
                rows: [
                  report.summary.map((s) =>
                    s.suffix ? `${s.value}${s.suffix}` : s.value,
                  ),
                ],
              }}
              onExportCsv={() => {
                const t = {
                  title: 'Executive Summary',
                  columns: report.summary!.map((s) => s.label),
                  rows: [
                    report.summary!.map((s) =>
                      s.suffix ? `${s.value}${s.suffix}` : s.value,
                    ),
                  ],
                }
                downloadCsv(t, 'executive-summary')
              }}
              onExportPdf={() =>
                downloadSectionPdf(
                  {
                    title: report.title,
                    subtitle: 'Executive Summary',
                    periodLabel: report.period?.label,
                    generatedBy,
                    scopeNote: report.filterScope?.containsNote,
                    includeSummary: true,
                    summary: report.summary,
                  },
                  {
                    title: 'Executive Summary',
                    columns: report.summary!.map((s) => s.label),
                    rows: [
                      report.summary!.map((s) =>
                        s.suffix ? `${s.value}${s.suffix}` : s.value,
                      ),
                    ],
                  },
                  `executive-summary-${range}.pdf`,
                )
              }
            />
          )}

          {filteredSections.map((section) => (
            <ReportSectionTable
              key={section.title}
              table={section}
              onExportCsv={() => downloadCsv(section, section.title.toLowerCase().replace(/\s+/g, '-'))}
              onExportPdf={() =>
                downloadSectionPdf(
                  {
                    title: report.title,
                    subtitle: section.title,
                    periodLabel: report.period?.label,
                    generatedBy,
                    scopeNote: report.filterScope?.containsNote,
                    includeSummary: false,
                  },
                  section,
                  `${section.title.toLowerCase().replace(/\s+/g, '-')}-${range}.pdf`,
                )
              }
              onRankingClick={(columnIndex, name, rowIndex) => {
                const filterCol = resolveRankingFilter(section.title, columnIndex)
                if (filterCol == null || !report.table) return
                const detail = filterCasesByRanking(
                  { ...report.table, rows: mainRows },
                  filterCol,
                  name,
                )
                const label =
                  section.title === 'Top 10 Rankings'
                    ? TOP_TEN_COLUMN_LABELS[columnIndex] ?? section.columns[columnIndex]
                    : section.columns[0]
                setRankingModal({
                  title: `${label}: ${name}`,
                  subtitle: `${detail?.rows.length ?? 0} related case(s) in this report period`,
                  detail,
                })
              }}
            />
          ))}

          {report.table && (
            <ReportSectionTable
              table={{
                ...report.table,
                title: q
                  ? `Case records matching search (${mainRows.length})`
                  : `${report.table.title} (${mainRows.length})`,
                rows: mainRows,
              }}
              selectable
              selectedRows={selectedCaseRows}
              onSelectedRowsChange={setSelectedCaseRows}
              selectionActions={
                selectedCaseRows.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => void exportSelectedCasesDossier()}
                    disabled={selectedCasesPdfLoading}
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg px-2.5 py-1 disabled:opacity-60"
                  >
                    {selectedCasesPdfLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Dossier PDF ({selectedCaseRows.size})
                  </button>
                ) : null
              }
              onExportCsv={() =>
                downloadCsv({ ...report.table!, rows: mainRows }, 'operations-cases')
              }
              onExportPdf={() =>
                downloadSectionPdf(
                  {
                    title: report.title,
                    subtitle: report.table!.title,
                    periodLabel: report.period?.label,
                    generatedBy,
                    scopeNote: report.filterScope?.containsNote,
                    includeSummary: false,
                  },
                  { ...report.table!, rows: mainRows },
                  `operations-cases-${range}.pdf`,
                )
              }
            />
          )}

          <RankingDetailModal
            open={Boolean(rankingModal)}
            onClose={() => setRankingModal(null)}
            title={rankingModal?.title ?? ''}
            subtitle={rankingModal?.subtitle}
            detailTable={rankingModal?.detail ?? null}
            pdfMeta={
              report
                ? {
                    title: report.title,
                    periodLabel: report.period?.label,
                    generatedBy,
                    scopeNote: report.filterScope?.containsNote,
                  }
                : undefined
            }
            pdfFilename={rankingModal?.title}
          />
        </>
      )}
    </div>
  )
}
