'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Sparkles } from 'lucide-react'
import { stationCoverageService } from '@/lib/api'
import { FieldLabel, fieldInputClass } from '@/components/features/emergency/dispatch-create/ui'

export type StationOption = {
  id: string
  name: string
  regionName?: string
  coversDistrict?: boolean
  isHomeDistrict?: boolean
}

type Props = {
  regionId: string
  districtId: string
  stationId: string
  error?: string
  onChange: (stationId: string) => void
}

export default function StationAssignmentField({
  regionId,
  districtId,
  stationId,
  error,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [singleStationMode, setSingleStationMode] = useState(false)
  const [suggestedName, setSuggestedName] = useState<string | null>(null)
  const [stations, setStations] = useState<StationOption[]>([])

  useEffect(() => {
    if (!districtId) {
      setStations([])
      setSuggestedName(null)
      setSingleStationMode(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await stationCoverageService.suggestStation(districtId, regionId || undefined)
        if (cancelled) return
        const alternatives: StationOption[] = Array.isArray(result?.alternatives)
          ? result.alternatives
          : []
        setSingleStationMode(Boolean(result?.singleStationMode))
        setStations(alternatives)
        const covering =
          alternatives.find((s) => s.coversDistrict && s.isHomeDistrict) ??
          alternatives.find((s) => s.coversDistrict)
        const nextId =
          covering?.id ??
          result?.suggested?.id ??
          result?.defaultStationId ??
          ''
        const nextName = covering?.name ?? result?.suggested?.name ?? null
        setSuggestedName(nextName)
        if (nextId) onChange(nextId)
      } catch {
        if (!cancelled) setStations([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [districtId, regionId])

  const coveringStation = useMemo(
    () =>
      stations.find((s) => s.coversDistrict && s.isHomeDistrict) ??
      stations.find((s) => s.coversDistrict) ??
      stations.find((s) => s.id === stationId),
    [stations, stationId],
  )

  const helper = useMemo(() => {
    if (loading) return 'Finding responsible station from district coverage…'
    if (!coveringStation) return 'No station covers this district yet. Configure station coverage first.'
    if (singleStationMode) return 'Single-station mode — assigned automatically.'
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <Sparkles className="w-3.5 h-3.5" />
        Assigned from patient district coverage — handled by {coveringStation.name}
      </span>
    )
  }, [loading, singleStationMode, coveringStation])

  if (!districtId) return null

  const displayName =
    coveringStation?.name ?? stations.find((s) => s.id === stationId)?.name ?? suggestedName ?? ''

  if (singleStationMode && stationId) {
    return (
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Responsible Station</p>
          <p className="text-sm font-bold text-slate-800">{displayName || 'Default station'}</p>
          <p className="text-xs text-slate-500 mt-1">{helper}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sm:col-span-2">
      <FieldLabel error={error}>Responsible Station</FieldLabel>
      <input
        className={`${fieldInputClass(error)} bg-slate-100 text-slate-700 cursor-not-allowed`}
        value={loading ? 'Resolving station…' : displayName}
        readOnly
        disabled
      />
      <p className="text-xs text-slate-500 mt-1">{helper}</p>
    </div>
  )
}
