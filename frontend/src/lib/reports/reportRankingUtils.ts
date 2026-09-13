export type ReportCaseTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

/** Case table column indexes (operations overview). */
export const CASE_COL = {
  tracking: 0,
  type: 1,
  patient: 2,
  category: 6,
  destination: 7,
  district: 8,
  station: 9,
  ambulance: 10,
  driver: 11,
  nurse: 12,
} as const

/** Top 10 Rankings columns → case table filter column (null = not filterable). */
export const TOP_TEN_FILTER_COLUMNS: Array<number | null> = [
  CASE_COL.district,
  null,
  CASE_COL.station,
  CASE_COL.driver,
  CASE_COL.nurse,
  null,
  CASE_COL.ambulance,
  CASE_COL.destination,
  CASE_COL.category,
  CASE_COL.category,
]

export const TOP_TEN_COLUMN_LABELS = [
  'Top District',
  'Top Region',
  'Top Station',
  'Top Driver',
  'Top Nurse',
  'Top Dispatcher',
  'Top Ambulance',
  'Top Hospital',
  'Top Emergency Type',
  'Top Transport Type',
]

/** Ranking list sections → filter column for name in column 0. */
export const SECTION_FILTER_COLUMN: Record<string, number> = {
  'Top Districts by Requests': CASE_COL.district,
  'Top Regions': CASE_COL.district,
  'Top Stations': CASE_COL.station,
  'Top Ambulances': CASE_COL.ambulance,
  'Top Drivers': CASE_COL.driver,
  'Top Nurses': CASE_COL.nurse,
  'Top Hospitals': CASE_COL.destination,
  'Emergency Types': CASE_COL.category,
  'Non-Emergency Transport Types': CASE_COL.category,
  'Cancellation Reasons': CASE_COL.category,
}

export function parseRankingName(cell: string | number): string {
  const raw = String(cell ?? '').trim()
  if (!raw || raw === 'Not recorded') return ''
  const match = raw.match(/^(.+?)\s*\(\d+\)\s*$/)
  return (match?.[1] ?? raw).trim()
}

export function filterCasesByRanking(
  caseTable: ReportCaseTable | undefined,
  filterColumn: number,
  name: string,
): ReportCaseTable | null {
  if (!caseTable || !name.trim()) return null
  const needle = name.trim().toLowerCase()
  const rows = caseTable.rows.filter((row) =>
    String(row[filterColumn] ?? '')
      .toLowerCase()
      .includes(needle),
  )
  if (!rows.length) return null
  return {
    title: `Related cases — ${name}`,
    columns: caseTable.columns,
    rows,
  }
}

export function isLinkableRankingCell(
  sectionTitle: string,
  columnIndex: number,
  cell: string | number,
): boolean {
  const name = parseRankingName(cell)
  if (!name) return false
  if (sectionTitle === 'Top 10 Rankings') {
    return TOP_TEN_FILTER_COLUMNS[columnIndex] != null
  }
  return columnIndex === 0 && Boolean(SECTION_FILTER_COLUMN[sectionTitle])
}

export function resolveRankingFilter(
  sectionTitle: string,
  columnIndex: number,
): number | null {
  if (sectionTitle === 'Top 10 Rankings') {
    return TOP_TEN_FILTER_COLUMNS[columnIndex] ?? null
  }
  if (columnIndex === 0) {
    return SECTION_FILTER_COLUMN[sectionTitle] ?? null
  }
  return null
}
