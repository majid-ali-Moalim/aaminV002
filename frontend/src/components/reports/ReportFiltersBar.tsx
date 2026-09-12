'use client'

import { useMemo } from 'react'
import type { AdminReportFilterOptions } from '@/lib/reports/adminReportsApi'

export type ReportFilterDef = {
  key: string
  label: string
  source:
    | 'regions'
    | 'districts'
    | 'priorities'
    | 'emergencyStatuses'
    | 'incidentCategories'
    | 'ambulances'
    | 'ambulanceStatuses'
    | 'vehicleTypes'
    | 'employeeRoles'
    | 'hospitals'
    | 'patientOutcomes'
    | 'transportTypes'
    | 'requestSources'
    | 'stations'
  dependsOnRegion?: boolean
}

const SOLE_KEYS = new Set([
  'region',
  'district',
  'priority',
  'status',
  'emergencyType',
  'hospital',
  'patientOutcome',
  'transportType',
  'ambulance',
  'ambulanceStatus',
  'vehicleType',
  'staffRole',
  'requestSource',
  'station',
])

function getSelectOptions(
  filter: ReportFilterDef,
  options: AdminReportFilterOptions | null,
  regionId: string,
) {
  if (!options) return []
  switch (filter.source) {
    case 'regions':
      return options.regions.map((r) => ({ value: r.id, label: r.name }))
    case 'districts': {
      const fromNested = options.regions.flatMap((r) =>
        (r.districts ?? []).map((d) => ({
          value: d.id,
          label: d.name,
          regionId: d.regionId || r.id,
        })),
      )
      const flat = options.districts.map((d) => ({
        value: d.id,
        label: d.name,
        regionId: d.regionId,
      }))
      const merged = (flat.length ? flat : fromNested).filter((d) =>
        !filter.dependsOnRegion || !regionId || d.regionId === regionId,
      )
      // de-dupe by id
      const seen = new Set<string>()
      return merged.filter((d) => {
        if (seen.has(d.value)) return false
        seen.add(d.value)
        return Boolean(d.value && d.label)
      })
    }
    case 'priorities':
      return options.priorities
    case 'emergencyStatuses':
      return options.emergencyStatuses
    case 'incidentCategories':
      return options.incidentCategories.map((c) => ({ value: c.id, label: c.name }))
    case 'ambulances':
      return options.ambulances.map((a) => ({
        value: a.id,
        label: `${a.ambulanceNumber}${a.plateNumber ? ` (${a.plateNumber})` : ''}`,
      }))
    case 'ambulanceStatuses':
      return options.ambulanceStatuses
    case 'vehicleTypes':
      return options.vehicleTypes
    case 'employeeRoles':
      return options.employeeRoles.map((r) => ({ value: r.id, label: r.name }))
    case 'hospitals':
      return options.hospitals.map((h) => ({ value: h.id, label: h.name }))
    case 'patientOutcomes':
      return options.patientOutcomes ?? []
    case 'transportTypes':
      return options.transportTypes ?? []
    case 'requestSources':
      return options.requestSources ?? []
    case 'stations':
      return options.stations ?? []
    default:
      return []
  }
}

export function applySoleFilterChange(
  current: Record<string, string>,
  key: string,
  value: string,
  soleFilter: boolean,
  districts: AdminReportFilterOptions['districts'],
): Record<string, string> {
  if (!soleFilter || !value.trim() || !SOLE_KEYS.has(key)) {
    const next = { ...current, [key]: value }
    if (key === 'region') next.district = ''
    return next
  }

  // Keep only date-related keys + this one sole dimension
  const next: Record<string, string> = {}
  if (current.startDate) next.startDate = current.startDate
  if (current.endDate) next.endDate = current.endDate

  if (key === 'district' && value) {
    const district = districts.find((d) => d.id === value)
    if (district?.regionId) next.region = district.regionId
    next.district = value
    return next
  }

  next[key] = value
  if (key === 'region') next.district = ''
  return next
}

export default function ReportFiltersBar({
  filterOptions,
  filters,
  setFilters,
  filterDefs,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  soleFilter,
  setSoleFilter,
  filtersLoading,
  filtersError,
  onClear,
  permissionLabel,
}: {
  filterOptions: AdminReportFilterOptions | null
  filters: Record<string, string>
  setFilters: (next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  filterDefs: ReportFilterDef[]
  startDate: string
  endDate: string
  setStartDate: (v: string) => void
  setEndDate: (v: string) => void
  soleFilter: boolean
  setSoleFilter: (v: boolean) => void
  filtersLoading?: boolean
  filtersError?: string
  onClear: () => void
  permissionLabel?: string
}) {
  const regionId = filters.region || ''
  const districtOptions = useMemo(
    () => getSelectOptions({ key: 'district', label: 'District', source: 'districts', dependsOnRegion: true }, filterOptions, regionId),
    [filterOptions, regionId],
  )

  const regionCount = filterOptions?.regions.length ?? 0
  const districtCount = filterOptions?.districts.length ?? districtOptions.length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Filters</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">Report Controls</h2>
          <p className="mt-1 text-xs text-slate-500">
            {filtersLoading
              ? 'Loading regions & districts…'
              : `${regionCount} region(s) · ${districtCount} district(s) loaded`}
          </p>
          {filtersError && <p className="mt-1 text-xs font-semibold text-amber-700">{filtersError}</p>}
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soleFilter}
            onChange={(e) => setSoleFilter(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          Sole filter
          <span className="text-[11px] font-semibold text-slate-500">(one filter at a time)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500"
          />
        </label>

        {filterDefs.map((filter) => {
          const options =
            filter.key === 'district'
              ? districtOptions
              : getSelectOptions(filter, filterOptions, regionId)
          return (
            <label key={filter.key} className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {filter.label}
              </span>
              <select
                value={filters[filter.key] || ''}
                disabled={filtersLoading || (filter.key === 'district' && !options.length && !regionId)}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters((current) =>
                    applySoleFilterChange(
                      current,
                      filter.key,
                      value,
                      soleFilter,
                      filterOptions?.districts ?? [],
                    ),
                  )
                }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">All {filter.label}s</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {filter.key === 'region' && !options.length && !filtersLoading && (
                <span className="text-[11px] text-amber-600">No regions available</span>
              )}
              {filter.key === 'district' && regionId && !options.length && !filtersLoading && (
                <span className="text-[11px] text-amber-600">No districts for selected region</span>
              )}
            </label>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600"
        >
          Clear Filters
        </button>
        {soleFilter && (
          <span className="text-xs font-semibold text-red-600">
            Sole mode on — choosing a filter clears the other report filters (dates kept).
          </span>
        )}
        {permissionLabel && (
          <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            Permission: {permissionLabel}
          </span>
        )}
      </div>
    </div>
  )
}
