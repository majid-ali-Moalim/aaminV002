'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Download,
  FileJson,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  getAdminReport,
  getAdminReportFilterOptions,
  type AdminReportFilterOptions,
} from '@/lib/reports/adminReportsApi'
import { downloadOperationsReportPdf } from '@/lib/reports/exportOperationsPdf'

type SummaryItem = { label: string; value: string | number; suffix?: string }
type ReportTable = { title: string; columns: string[]; rows: Array<Array<string | number>> }
type ChartSpec = {
  title: string
  type: 'pie' | 'bar'
  data: Array<{ name: string; value: number }>
}

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
  charts?: ChartSpec[]
  sections?: ReportTable[]
  table?: ReportTable
  permissions?: string[]
}

const CHART_COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#64748b']

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
  const [reloadKey, setReloadKey] = useState(0)
  const [pdfExporting, setPdfExporting] = useState(false)

  useEffect(() => {
    getAdminReportFilterOptions().then(setFilterOptions).catch(() => {})
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

  const mainRows = useMemo(() => {
    const table = report?.table
    if (!table) return []
    const q = search.trim().toLowerCase()
    return q
      ? table.rows.filter((row) =>
          row.some((cell) => String(cell ?? '').toLowerCase().includes(q)),
        )
      : table.rows
  }, [report?.table, search])

  const downloadCsv = (table: ReportTable, name: string) => {
    const csv = [table.columns, ...table.rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadText(`${name}-${range}.csv`, csv, 'text/csv')
    toast.success('CSV downloaded')
  }

  const regionName = filterOptions?.regions.find((r) => r.id === filters.region)?.name
  const districtName = filterOptions?.districts.find((d) => d.id === filters.district)?.name

  const downloadPdf = async () => {
    if (!report || pdfExporting) return
    const hasData =
      Boolean(report.table?.rows.length) ||
      Boolean(report.sections?.some((s) => s.rows.length)) ||
      Boolean(report.charts?.some((c) => c.data.length))
    if (!hasData) {
      toast.error('No data to export')
      return
    }
    setPdfExporting(true)
    try {
      await downloadOperationsReportPdf(report, mainRows, {
        range,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        regionName,
        districtName,
        search,
      })
      toast.success('PDF report downloaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      toast.error(message)
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
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-200">
                AADS Analytics
              </p>
              <h1 className="mt-1 text-2xl font-black">
                {report?.filterScope?.mode === 'filtered'
                  ? `${report?.title || 'Operations Intelligence'} — Filtered`
                  : report?.title || 'Operations Intelligence'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                {report?.filterScope?.containsNote ||
                  report?.subtitle ||
                  'Case overview, emergency analysis, resources, locations, hospitals, and performance.'}
              </p>
              {report?.filterScope && (
                <p className="mt-2 inline-flex items-center rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200">
                  {report.filterScope.label}
                  {report.filterScope.description ? ` · ${report.filterScope.description}` : ''}
                </p>
              )}
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
            {report && (
              <>
                {report.table && (
                  <button
                    type="button"
                    onClick={() => downloadCsv(report.table!, 'operations-cases')}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  disabled={pdfExporting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  {pdfExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(`operations-${range}.json`, JSON.stringify(report, null, 2), 'application/json')}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold"
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Filters</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
          <select
            value={filters.region || ''}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value, district: '' }))}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
          >
            <option value="">All regions</option>
            {filterOptions?.regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={filters.district || ''}
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
          >
            <option value="">All districts</option>
            {filterOptions?.districts
              .filter((d) => !filters.region || d.regionId === filters.region)
              .map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </select>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Permission: {report?.permissions?.join(', ') || 'report.view'}
        </div>
      </div>

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
          {!!report.summary?.length && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {report.summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Activity className="h-4 w-4 text-red-600 mb-2" />
                  <p className="text-xl font-black text-slate-950 truncate" title={String(item.value)}>
                    {item.value}
                    {item.suffix && <span className="ml-1 text-xs text-slate-500">{item.suffix}</span>}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-tight">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {!!report.charts?.length && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {report.charts.map((chart) => (
                <div key={chart.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 mb-4">{chart.title}</h2>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.type === 'pie' ? (
                        <PieChart>
                          <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {chart.data.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      ) : (
                        <BarChart data={chart.data}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.sections?.map((section) => (
            <div key={section.title} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">{section.title}</h2>
                <button
                  type="button"
                  onClick={() => downloadCsv(section, section.title.toLowerCase().replace(/\s+/g, '-'))}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {section.columns.map((col) => (
                        <th key={col} className="px-4 py-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {section.rows.length === 0 ? (
                      <tr>
                        <td colSpan={section.columns.length} className="px-4 py-8 text-center text-slate-400">
                          No data for this period
                        </td>
                      </tr>
                    ) : (
                      section.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2.5 font-medium text-slate-800">{cell}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {report.table && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-black text-slate-900">
                  {report.filterScope?.mode === 'filtered' || search.trim()
                    ? `Filtered Cases Overview (${mainRows.length} row(s))`
                    : report.table.title}
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search cases…"
                    className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {report.table.columns.map((col) => (
                        <th key={col} className="px-3 py-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mainRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-xs font-medium text-slate-800">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
