'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
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
import { reportsService } from '@/lib/api'

type SummaryItem = {
  label: string
  value: string | number
  suffix?: string
}

type ReportChart = {
  title: string
  type: 'bar' | 'line' | 'area' | 'pie'
  data: any[]
  xKey?: string
  series?: { key: string; label: string }[]
}

type ReportData = {
  title: string
  subtitle: string
  period?: { label: string }
  summary?: SummaryItem[]
  charts?: ReportChart[]
  table?: {
    title: string
    columns: string[]
    rows: Array<Array<string | number>>
  }
  exportBundles?: { key: string; label: string; rows: number }[]
  reports?: Record<string, ReportData>
  notes?: string[]
  permissions?: string[]
}

const CHART_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#64748b']

const REPORT_LABELS: Record<string, string> = {
  executive: 'Admin Executive Dashboard',
  emergency: 'Emergency Reports',
  utilization: 'Ambulance Utilization',
  performance: 'Staff Performance Reports',
  hospitals: 'Hospital Acceptance Reports',
  'response-time': 'Response Time Analysis',
  outcomes: 'Case Outcome Reports',
  export: 'Export PDF / Excel',
}

const FILTERS_BY_TYPE: Record<string, { key: string; label: string; placeholder: string }[]> = {
  executive: [
    { key: 'region', label: 'Region', placeholder: 'Region name or ID' },
    { key: 'district', label: 'District', placeholder: 'District name or ID' },
  ],
  emergency: [
    { key: 'region', label: 'Region', placeholder: 'Region name or ID' },
    { key: 'district', label: 'District', placeholder: 'District name or ID' },
    { key: 'priority', label: 'Priority', placeholder: 'CRITICAL / HIGH / MEDIUM / LOW' },
    { key: 'status', label: 'Status', placeholder: 'PENDING / COMPLETED / CANCELLED' },
    { key: 'emergencyType', label: 'Emergency Type', placeholder: 'Trauma / Cardiac / Accident' },
  ],
  utilization: [
    { key: 'ambulance', label: 'Ambulance', placeholder: 'Ambulance number, plate, or ID' },
    { key: 'vehicleType', label: 'Vehicle Type', placeholder: 'ALS / BLS / ICU' },
  ],
  performance: [
    { key: 'staffRole', label: 'Staff Role', placeholder: 'Dispatcher / Driver / Nurse' },
  ],
  hospitals: [
    { key: 'hospital', label: 'Hospital', placeholder: 'Hospital name or ID' },
  ],
  'response-time': [
    { key: 'region', label: 'Region', placeholder: 'Region name or ID' },
    { key: 'district', label: 'District', placeholder: 'District name or ID' },
    { key: 'priority', label: 'Priority', placeholder: 'CRITICAL / HIGH / MEDIUM / LOW' },
  ],
  outcomes: [
    { key: 'region', label: 'Region', placeholder: 'Region name or ID' },
    { key: 'district', label: 'District', placeholder: 'District name or ID' },
    { key: 'status', label: 'Outcome Status', placeholder: 'COMPLETED / CANCELLED / TRANSPORTING' },
  ],
  export: [
    { key: 'region', label: 'Region', placeholder: 'Region name or ID' },
    { key: 'district', label: 'District', placeholder: 'District name or ID' },
  ],
}

const MODULE_DETAILS: Record<string, Record<string, string[]>> = {
  executive: {
    'Module Purpose': ['Give leadership a single operational command view across cases, fleet, staff, response time, and hospital readiness.'],
    'Business Objectives': ['Improve daily decision-making', 'Expose SLA and capacity risks', 'Support executive briefings'],
    'User Roles Allowed': ['ADMIN', 'Operations Manager', 'EMS Director'],
    'Database Tables': ['emergency_requests', 'ambulances', 'employees', 'attendance_records', 'referrals', 'hospitals', 'activity_logs'],
    'API Endpoints': ['GET /api/reports/admin/executive', 'GET /api/reports/admin/export'],
    'Future Scalability': ['Predictive demand forecasting', 'GIS heatmaps', 'scheduled executive summaries'],
  },
  emergency: {
    'Module Purpose': ['Analyze emergency case volume, priority, location, category, and operational trend patterns.'],
    'Business Objectives': ['Reduce backlog', 'Balance dispatch demand', 'Identify high-risk districts and categories'],
    'User Roles Allowed': ['ADMIN', 'Dispatcher Supervisor', 'Operations Manager'],
    'Dashboard Layout': ['KPI strip', 'trend charts', 'priority/status charts', 'recent cases table', 'filter panel'],
    'KPI Cards': ['Total Emergencies', 'Open Cases', 'Completed Cases', 'Cancelled Cases', 'Critical Cases', 'Cancellation Rate'],
    'Data Tables': ['Recent emergency cases with tracking code, patient, priority, status, pickup, created date'],
    'Filters': ['Date Range', 'District', 'Region', 'Priority', 'Status', 'Emergency Type'],
    'Search Features': ['Client-side table search across tracking code, patient, status, and pickup location'],
    'Charts & Visualizations': ['Line/area trend', 'priority pie chart', 'status pie chart', 'bar chart', 'heatmap-ready district/category data'],
    'Database Tables': ['emergency_requests', 'patients', 'incident_categories', 'regions', 'districts', 'activity_logs'],
    'API Endpoints': ['GET /api/reports/admin/emergency'],
    'Backend Logic': ['Aggregates counts, groups by priority/status, calculates rates, builds period trends'],
    'User Actions': ['Filter', 'search', 'refresh', 'export CSV', 'print PDF', 'download JSON'],
    'Export Features': ['Filtered CSV', 'JSON dataset', 'browser PDF print'],
    'Audit Logs': ['REPORT_VIEWED entries in activity_logs'],
    'Permissions': ['report.view', 'report.kpi', 'report.export', 'report.audit'],
    'Mobile Responsiveness': ['Single-column cards on phones, responsive chart containers, horizontal table scroll'],
    'Future Scalability': ['GIS heatmap overlays', 'category forecasting', 'district SLA prediction'],
  },
  utilization: {
    'Module Purpose': ['Measure ambulance workload, availability, readiness, mission distribution, and fleet efficiency.'],
    'Business Objectives': ['Maximize fleet availability', 'Reduce downtime', 'identify overused and underused vehicles'],
    'User Roles Allowed': ['ADMIN', 'Fleet Manager', 'Operations Manager'],
    'KPI Cards': ['Total Ambulances', 'Active Ambulances', 'Available Ambulances', 'Busy Ambulances', 'Out of Service', 'Utilization Rate', 'Average Mission Duration', 'Total Missions'],
    'Filters': ['Ambulance', 'Vehicle Type', 'Date Range'],
    'Charts & Visualizations': ['Fleet utilization trend', 'vehicle comparison', 'daily activity chart', 'monthly utilization graph'],
    'Database Tables': ['ambulances', 'emergency_requests', 'stations', 'employees', 'activity_logs'],
    'API Endpoints': ['GET /api/reports/admin/utilization'],
    'Future Scalability': ['Telematics integration', 'maintenance prediction', 'fuel and mileage analytics'],
  },
  performance: {
    'Module Purpose': ['Rank and compare dispatcher, driver, nurse, and call-center staff performance.'],
    'Business Objectives': ['Improve productivity', 'coach low performers', 'recognize monthly leaders', 'track attendance health'],
    'User Roles Allowed': ['ADMIN', 'HR Manager', 'Department Lead'],
    'KPI Cards': ['Cases Assigned', 'Missions Completed', 'Response Time', 'Attendance Rate', 'Treatment Records', 'Handover Completion'],
    'Filters': ['Staff Role', 'Date Range'],
    'Charts & Visualizations': ['Staff ranking', 'department comparison', 'monthly leaderboard', 'role distribution'],
    'Database Tables': ['employees', 'employee_roles', 'attendance_records', 'emergency_requests', 'patient_care_records'],
    'API Endpoints': ['GET /api/reports/admin/performance'],
    'Future Scalability': ['Weighted performance scoring', 'certification tracking', 'shift fairness analytics'],
  },
  hospitals: {
    'Module Purpose': ['Measure hospital referral collaboration, acceptance, rejection, and capacity readiness.'],
    'Business Objectives': ['Improve patient handover speed', 'reduce rejected referrals', 'identify high-performing hospitals'],
    'User Roles Allowed': ['ADMIN', 'Hospital Coordinator', 'Operations Manager'],
    'KPI Cards': ['Patients Referred', 'Accepted', 'Rejected', 'Acceptance Rate', 'Rejection Rate', 'Average Acceptance Time'],
    'Filters': ['Hospital', 'Date Range'],
    'Charts & Visualizations': ['Acceptance trends', 'rejection trends', 'hospital comparison charts'],
    'Database Tables': ['hospitals', 'referrals', 'emergency_requests', 'regions', 'districts'],
    'API Endpoints': ['GET /api/reports/admin/hospitals'],
    'Future Scalability': ['Bed API integration', 'ICU capacity feed', 'automated referral routing'],
  },
  'response-time': {
    'Module Purpose': ['Measure dispatch, assignment, travel, pickup, transport, handover, and total response timing.'],
    'Business Objectives': ['Protect SLA compliance', 'identify slow districts', 'optimize mobilization and routing'],
    'User Roles Allowed': ['ADMIN', 'Dispatch Supervisor', 'Operations Manager'],
    'KPI Cards': ['Average Response Time', 'Average Service Time', 'SLA Compliance', 'Measured Cases'],
    'Filters': ['Date Range', 'District', 'Region', 'Priority'],
    'Charts & Visualizations': ['Response trend', 'district comparison', 'priority comparison', 'SLA gauge'],
    'Database Tables': ['emergency_requests', 'emergency_status_logs', 'regions', 'districts'],
    'API Endpoints': ['GET /api/reports/admin/response-time'],
    'Future Scalability': ['Route ETA ingestion', 'real-time SLA alerting', 'traffic-aware analytics'],
  },
  outcomes: {
    'Module Purpose': ['Analyze patient transport outcomes and case completion quality.'],
    'Business Objectives': ['Improve patient outcomes', 'reduce cancellations', 'track referral patterns'],
    'User Roles Allowed': ['ADMIN', 'Medical Director', 'Operations Manager'],
    'KPI Cards': ['Success Rate', 'Completion Rate', 'Referral Rate', 'Cancellation Rate'],
    'Filters': ['Date Range', 'District', 'Region', 'Status'],
    'Charts & Visualizations': ['Outcome distribution', 'success trends', 'comparative outcomes'],
    'Database Tables': ['emergency_requests', 'patient_care_records', 'incident_reports', 'ambulances', 'employees', 'hospitals'],
    'API Endpoints': ['GET /api/reports/admin/outcomes'],
    'Future Scalability': ['Clinical outcome taxonomy', 'hospital outcome feedback', 'quality assurance workflow'],
  },
  export: {
    'Module Purpose': ['Provide enterprise-grade filtered exports and downloadable report bundles.'],
    'Business Objectives': ['Support compliance reviews', 'monthly reporting', 'stakeholder communication'],
    'User Roles Allowed': ['ADMIN', 'Operations Manager', 'Auditor'],
    'User Actions': ['Download CSV', 'print PDF', 'download JSON', 'refresh export packages'],
    'Export Features': ['PDF', 'Excel-compatible CSV', 'JSON', 'filtered exports', 'download history via audit logs'],
    'Database Tables': ['activity_logs plus all source report tables'],
    'API Endpoints': ['GET /api/reports/admin/export'],
    'Future Scalability': ['Scheduled reports', 'email reports', 'stored export files', 'approval workflow'],
  },
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
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadReport() {
      setLoading(true)
      setError('')
      try {
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value.trim()),
        )
        const data = await reportsService.getAdminReport(type, {
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ...cleanFilters,
        })
        if (active) setReport(data)
      } catch (err: any) {
        if (active) setError(err?.response?.data?.message || 'Failed to load report data')
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
  const table = report?.table
  const activeFilters = FILTERS_BY_TYPE[type] || FILTERS_BY_TYPE.executive
  const moduleDetails = MODULE_DETAILS[type] || MODULE_DETAILS.executive

  const exportRows = useMemo(() => {
    if (!table) return []
    const normalizedSearch = search.trim().toLowerCase()
    const rows = normalizedSearch
      ? table.rows.filter((row) =>
          row.some((cell) => String(cell ?? '').toLowerCase().includes(normalizedSearch)),
        )
      : table.rows
    return [table.columns, ...rows]
  }, [search, table])

  const visibleRows = useMemo(() => exportRows.slice(1), [exportRows])

  const downloadCsv = (name = type, rows = exportRows) => {
    if (!rows.length) return
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')
    downloadText(`${name}-${range}.csv`, csv, 'text/csv')
  }

  const downloadJson = (name = type, data: unknown = report) => {
    downloadText(`${name}-${range}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-red-600 p-3 shadow-lg shadow-red-950/30">
              <BarChart2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-200">Analytics & Reports</p>
              <h1 className="mt-1 text-2xl font-black">{heading}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                {report?.subtitle || 'Integrated backend analytics for operational reporting.'}
              </p>
              {report?.period?.label && (
                <p className="mt-2 text-xs font-semibold text-slate-400">Period: {report.period.label}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
              disabled={!table}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report}
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
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Filters</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Operational Report Controls</h2>
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
            {activeFilters.map((filter) => (
              <label key={filter.key} className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{filter.label}</span>
                <input
                  type="text"
                  value={filters[filter.key] || ''}
                  onChange={(event) => setFilters((current) => ({ ...current, [filter.key]: event.target.value }))}
                  placeholder={filter.placeholder}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
                />
              </label>
            ))}
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
          Loading backend report data...
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(report.summary || []).map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Activity className="h-5 w-5 text-red-600" />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Live
                  </span>
                </div>
                <p className="text-3xl font-black text-slate-950">
                  {item.value}
                  {item.suffix && <span className="ml-1 text-lg text-slate-500">{item.suffix}</span>}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          {type === 'export' && report.exportBundles && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">Export Center</h2>
              <p className="mt-1 text-sm text-slate-500">Download each generated backend report bundle.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {report.exportBundles.map((bundle) => (
                  <div key={bundle.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">{bundle.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{bundle.rows} rows ready</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const child = report.reports?.[bundle.key]
                          if (child?.table) downloadCsv(bundle.key, [child.table.columns, ...child.table.rows])
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadJson(bundle.key, report.reports?.[bundle.key])}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!report.charts?.length && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {report.charts.map((chart) => (
                <div key={chart.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-900">{chart.title}</h2>
                  <div className="mt-4 h-80">
                    <ReportChartView chart={chart} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {table && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{table.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{visibleRows.length} records in this filtered view</p>
                </div>
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
                    onClick={() => setReloadKey((current) => current + 1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {table.columns.map((column) => (
                        <th key={column} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={`${row.join('-')}-${rowIndex}`} className="hover:bg-slate-50">
                        {row.map((cell, cellIndex) => (
                          <td key={`${cellIndex}-${String(cell)}`} className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
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
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Production Implementation Blueprint</h2>
            <p className="mt-1 text-sm text-slate-500">
              EMS operations, architecture, UX, permissions, reporting workflow, and scalability details for this menu.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Object.entries(moduleDetails).map(([title, items]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">{title}</h3>
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li key={item} className="text-sm leading-6 text-slate-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ReportChartView({ chart }: { chart: ReportChart }) {
  if (!chart.data?.length) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400">No chart data available.</div>
  }

  if (chart.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={105} paddingAngle={2}>
            {chart.data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chart.xKey || 'label'} />
          <YAxis />
          <Tooltip />
          <Legend />
          {(chart.series || []).map((series, index) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={3}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chart.xKey || 'label'} />
          <YAxis />
          <Tooltip />
          <Legend />
          {(chart.series || []).map((series, index) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              fillOpacity={0.18}
              strokeWidth={3}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={chart.xKey || 'label'} />
        <YAxis />
        <Tooltip />
        <Legend />
        {(chart.series || []).map((series, index) => (
          <Bar key={series.key} dataKey={series.key} name={series.label} fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
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
