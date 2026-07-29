import { downloadFullReportPdf } from '@/lib/reports/exportPdf'

type SummaryItem = { label: string; value: string | number; suffix?: string }
type ReportTable = { title: string; columns: string[]; rows: Array<Array<string | number>> }
type ChartSpec = {
  title: string
  type: 'pie' | 'bar'
  data: Array<{ name: string; value: number }>
}

export type OperationsFilterScope = {
  mode: 'filtered' | 'full'
  label: string
  description: string
  containsNote: string
}

export type OperationsReportPdfSource = {
  title: string
  subtitle?: string
  period?: { label: string }
  filterScope?: OperationsFilterScope
  summary?: SummaryItem[]
  charts?: ChartSpec[]
  sections?: ReportTable[]
  table?: ReportTable
}

export type OperationsReportPdfFilters = {
  range: string
  startDate?: string
  endDate?: string
  regionName?: string
  districtName?: string
  search?: string
}

const RANGE_LABELS: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '365d': 'Last 12 months',
}

function buildClientFilterScope(filters: OperationsReportPdfFilters): OperationsFilterScope {
  const parts: string[] = []
  if (filters.startDate || filters.endDate) {
    parts.push(`Custom dates: ${filters.startDate || '…'} to ${filters.endDate || '…'}`)
  } else {
    parts.push(`Period: ${RANGE_LABELS[filters.range] ?? filters.range}`)
  }
  if (filters.regionName) parts.push(`Region: ${filters.regionName}`)
  if (filters.districtName) parts.push(`District: ${filters.districtName}`)
  if (filters.search?.trim()) parts.push(`Search: "${filters.search.trim()}"`)

  const filtered = Boolean(
    filters.regionName || filters.districtName || filters.startDate || filters.endDate || filters.search?.trim(),
  )

  return {
    mode: filtered ? 'filtered' : 'full',
    label: filtered
      ? 'Specific data according to applied filters'
      : 'All operations data for the selected period',
    description: parts.join(' · '),
    containsNote: filtered
      ? `This report contains specific data matching your filters (${parts.join(' · ')}). It is not a full "all emergencies" export.`
      : `This report contains all operations data for the selected time period (${parts.join(' · ')}). No location or search filters were applied.`,
  }
}

function resolveFilterScope(
  report: OperationsReportPdfSource,
  filters: OperationsReportPdfFilters,
): OperationsFilterScope {
  const base = report.filterScope ?? buildClientFilterScope(filters)
  if (!filters.search?.trim()) return base

  const description = [base.description, `Search: "${filters.search.trim()}"`].filter(Boolean).join(' · ')
  return {
    mode: 'filtered',
    label: 'Specific data according to applied filters',
    description,
    containsNote: `This report contains specific data matching your filters (${description}). It is not a full "all emergencies" export.`,
  }
}

export async function downloadOperationsReportPdf(
  report: OperationsReportPdfSource,
  filteredMainRows: Array<Array<string | number>>,
  filters: OperationsReportPdfFilters,
) {
  const scope = resolveFilterScope(report, filters)
  const isFiltered = scope.mode === 'filtered'

  const tables: ReportTable[] = [
    ...(report.sections?.map((section) => ({
      ...section,
      title: isFiltered ? `${section.title} (filtered dataset)` : section.title,
    })) ?? []),
    ...(report.charts?.map((chart) => ({
      title: isFiltered ? `${chart.title} (filtered dataset)` : chart.title,
      columns: ['Category', 'Value'],
      rows: chart.data.map((d) => [d.name, d.value]),
    })) ?? []),
  ]

  if (report.table) {
    tables.push({
      ...report.table,
      title: isFiltered
        ? `Filtered Cases Overview (${filteredMainRows.length} row(s) matching filters)`
        : `${report.table.title} (${filteredMainRows.length} row(s))`,
      rows: filteredMainRows,
    })
  }

  if (!tables.length) {
    throw new Error('No report data to export')
  }

  const title = isFiltered
    ? `${report.title || 'Operations Intelligence'} — Filtered Report`
    : report.title || 'Operations Intelligence'

  await downloadFullReportPdf(
    {
      title,
      subtitle: scope.description,
      scopeNote: scope.containsNote,
      periodLabel: report.period?.label,
      summary: report.summary,
    },
    tables,
    `operations-${isFiltered ? 'filtered' : filters.range}.pdf`,
  )
}
