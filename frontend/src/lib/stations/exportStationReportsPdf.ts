import { format } from 'date-fns'
import { downloadFullReportPdf } from '@/lib/reports/exportPdf'
import type { StationReportFilters, StationRow, TransferRow } from '@/lib/stations/stationReportsFilters'
import { buildFilterDescription, isFiltersActive } from '@/lib/stations/stationReportsFilters'

type TransferAnalytics = {
  byStation?: Array<{
    stationId: string
    stationName: string
    transfersIn: number
    transfersOut: number
    total: number
  }>
  byReason?: Array<{ reason: string; count: number }>
  topRoutes?: Array<{ from: string; to: string; count: number }>
  totalTransfers?: number
}

export type StationReportPdfInput = {
  tab: string
  filters: StationReportFilters
  stations: StationRow[]
  filteredStations: StationRow[]
  filteredTransfers: TransferRow[]
  transferAnalytics?: TransferAnalytics
  overview?: {
    cards?: Record<string, number>
    cases?: Record<string, number>
    transfersKpi?: Record<string, number>
  }
}

export async function downloadStationReportsPdf(input: StationReportPdfInput) {
  const filtered = isFiltersActive(input.filters)
  const scopeNote = filtered
    ? `This report contains data matching your applied filters. ${buildFilterDescription(input.filters, input.stations)}`
    : 'This report contains all station operational data currently loaded (no filters applied).'

  const summary = [
    { label: 'Stations shown', value: input.filteredStations.length },
    { label: 'Transfers shown', value: input.filteredTransfers.length },
    { label: 'Report section', value: input.tab },
  ]

  const tables: Array<{ title: string; columns: string[]; rows: Array<Array<string | number>> }> = []

  if (input.tab === 'overview' || input.tab === 'all') {
    const cards = input.overview?.cards ?? {}
    tables.push({
      title: 'Network overview',
      columns: ['Metric', 'Value'],
      rows: [
        ['Total stations', cards.totalStations ?? 0],
        ['Active stations', cards.activeStations ?? 0],
        ['Total ambulances', cards.totalAmbulances ?? 0],
        ['Available ambulances', cards.availableAmbulances ?? 0],
        ['Active cases', cards.activeCases ?? 0],
        ['Pending cases', cards.pendingCases ?? 0],
      ],
    })
  }

  tables.push({
    title: filtered ? 'Station breakdown (filtered)' : 'Station breakdown',
    columns: [
      'Code',
      'Station',
      'Region',
      'Home district',
      'Ambulances',
      'Staff',
      'Active cases',
      'Transfers in',
      'Transfers out',
      'Status',
    ],
    rows: input.filteredStations.map((s) => {
      const tin = input.filteredTransfers.filter((t) => t.toStation?.id === s.id).length
      const tout = input.filteredTransfers.filter((t) => t.fromStation?.id === s.id).length
      const staff =
        (s.counts?.drivers ?? 0) + (s.counts?.nurses ?? 0) + (s.counts?.dispatchers ?? 0)
      return [
        s.code ?? '—',
        s.name,
        s.region?.name ?? '—',
        s.homeDistrict?.name ?? '—',
        s.counts?.ambulances ?? 0,
        staff,
        s.counts?.activeCases ?? 0,
        tin,
        tout,
        s.isActive ? 'Active' : 'Inactive',
      ]
    }),
  })

  if (input.transferAnalytics?.byStation?.length) {
    tables.push({
      title: 'Transfers by station (network)',
      columns: ['Station', 'Transfers in', 'Transfers out', 'Total'],
      rows: input.transferAnalytics.byStation.map((r) => [
        r.stationName,
        r.transfersIn,
        r.transfersOut,
        r.total,
      ]),
    })
  }

  if (input.transferAnalytics?.byReason?.length) {
    tables.push({
      title: 'Transfer reasons',
      columns: ['Reason', 'Count'],
      rows: input.transferAnalytics.byReason.map((r) => [r.reason, r.count]),
    })
  }

  if (input.transferAnalytics?.topRoutes?.length) {
    tables.push({
      title: 'Top transfer routes',
      columns: ['From station', 'To station', 'Count'],
      rows: input.transferAnalytics.topRoutes.map((r) => [r.from, r.to, r.count]),
    })
  }

  if (input.tab === 'transfers' || input.tab === 'all') {
    tables.push({
      title: filtered ? 'Transfer log (filtered)' : 'Transfer log',
      columns: ['Case', 'Priority', 'From', 'To', 'Reason', 'By', 'Date', 'Status'],
      rows: input.filteredTransfers.map((t) => [
        t.trackingCode ?? '—',
        t.priority ?? '—',
        t.fromStation?.name ?? '—',
        t.toStation?.name ?? '—',
        t.reason ?? '—',
        t.transferredBy ?? '—',
        t.transferredAt ? format(new Date(t.transferredAt), 'yyyy-MM-dd HH:mm') : '—',
        t.caseStatus ?? '—',
      ]),
    })
  }

  if (!tables.length) throw new Error('No report data to export')

  const stamp = format(new Date(), 'yyyy-MM-dd')
  const title = filtered ? 'Station Reports — Filtered Export' : 'Station Reports — Full Export'

  await downloadFullReportPdf(
    {
      title,
      subtitle: buildFilterDescription(input.filters, input.stations),
      scopeNote,
      summary,
    },
    tables,
    `station-reports-${input.tab}-${filtered ? 'filtered' : 'full'}-${stamp}.pdf`,
  )
}
