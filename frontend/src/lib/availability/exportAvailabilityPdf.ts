import { format } from 'date-fns'
import { downloadReportPdf } from '@/lib/reports/exportPdf'
import { displayAvailabilityStatus } from '@/lib/availability/labels'

export type AvailabilityPdfRow = {
  employeeId: string
  employeeName: string
  role: string
  department: string
  phone: string
  shift: string
  status: string
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  hoursInProgress?: boolean
}

export type AvailabilityPdfFilters = {
  search: string
  role: string
  statusFilter: 'all' | 'Present' | 'Absent'
}

export type AvailabilityPdfSummary = {
  total: number
  present: number
  absent: number
  presentPercentage?: number
  absentPercentage?: number
}

function formatClock(value: string | null) {
  if (!value) return '—'
  return format(new Date(value), 'MMM d, yyyy · HH:mm:ss')
}

function formatHours(row: AvailabilityPdfRow) {
  if (row.totalHours == null) return '—'
  const label = `${row.totalHours.toFixed(2)} h`
  return row.hoursInProgress ? `${label} (in progress)` : label
}

function filterDescription(filters: AvailabilityPdfFilters): string {
  const parts: string[] = []
  if (filters.search.trim()) parts.push(`Search: "${filters.search.trim()}"`)
  if (filters.role) parts.push(`Role: ${filters.role}`)
  if (filters.statusFilter !== 'all') {
    parts.push(`Status: ${displayAvailabilityStatus(filters.statusFilter)}`)
  }
  return parts.length ? parts.join(' · ') : 'All crew members (no filters applied)'
}

export async function downloadAvailabilityPdf(input: {
  date: string
  rows: AvailabilityPdfRow[]
  summary: AvailabilityPdfSummary | null
  filters: AvailabilityPdfFilters
  activeShift?: string
  viewingToday?: boolean
}) {
  const { date, rows, summary, filters, activeShift, viewingToday } = input

  if (!rows.length) {
    throw new Error('No data to export')
  }

  const dateLabel = format(new Date(`${date}T12:00:00`), 'EEEE, MMMM d, yyyy')
  const filteredSummary = {
    total: rows.length,
    present: rows.filter((r) => r.status === 'Present').length,
    absent: rows.filter((r) => r.status === 'Absent').length,
  }
  const filteredRate =
    filteredSummary.total > 0
      ? Math.round((filteredSummary.present / filteredSummary.total) * 100)
      : 0

  const subtitleParts = [filterDescription(filters)]
  if (activeShift) subtitleParts.push(`Active shift: ${activeShift}`)
  if (viewingToday !== undefined) {
    subtitleParts.push(viewingToday ? 'Live board (today)' : 'Historical date')
  }

  await downloadReportPdf(
    {
      title: 'Crew Availability Report',
      subtitle: subtitleParts.join(' · '),
      periodLabel: dateLabel,
      summary: [
        { label: 'Report rows', value: filteredSummary.total },
        { label: 'Available', value: filteredSummary.present },
        { label: 'Unavailable', value: filteredSummary.absent },
        { label: 'Availability rate', value: `${filteredRate}%` },
        ...(summary
          ? [
              { label: 'All staff (day)', value: summary.total },
              { label: 'Day available', value: summary.present },
              { label: 'Day unavailable', value: summary.absent },
              {
                label: 'Day rate',
                value: `${summary.presentPercentage ?? 0}%`,
              },
            ]
          : []),
      ],
      table: {
        title: `Crew availability — ${rows.length} record(s)`,
        columns: [
          'Employee',
          'ID',
          'Phone',
          'Role',
          'Department',
          'Shift',
          'Shift start',
          'Shift end',
          'Hours',
          'Status',
        ],
        rows: rows.map((r) => [
          r.employeeName,
          r.employeeId,
          r.phone || '—',
          r.role,
          r.department || '—',
          r.shift || '—',
          formatClock(r.clockIn),
          formatClock(r.clockOut),
          formatHours(r),
          displayAvailabilityStatus(r.status),
        ]),
      },
    },
    `crew-availability-${date}.pdf`,
  )
}
