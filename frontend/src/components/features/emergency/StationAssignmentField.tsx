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
        setSingleStationMode(Boolean(result?.singleStationMode))
        setSuggestedName(result?.suggested?.name ?? null)
        setStations(Array.isArray(result?.alternatives) ? result.alternatives : [])
        const nextId =
          result?.suggested?.id ??
          result?.defaultStationId ??
          ''
        if (nextId && (!stationId || result?.singleStationMode)) {
          onChange(nextId)
        }
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

  const showPicker = !singleStationMode && stations.length > 1

  const helper = useMemo(() => {
    if (loading) return 'Finding responsible station…'
    if (singleStationMode) return 'Single-station mode — assigned automatically.'
    if (suggestedName && stationId) {
      const selected = stations.find((s) => s.id === stationId)
      if (selected?.id === stations.find((s) => s.coversDistrict)?.id || suggestedName) {
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" />
            Suggested: {suggestedName}
          </span>
        )
      }
    }
    return 'Choose the station that will handle this case.'
  }, [loading, singleStationMode, suggestedName, stationId, stations])

  if (!districtId) return null

  if (singleStationMode && stationId) {
    const name = stations.find((s) => s.id === stationId)?.name ?? suggestedName ?? 'Default station'
    return (
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
        <Building2 className="w-5 h-5 text-slate-500 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Responsible Station</p>
          <p className="text-sm font-bold text-slate-800">{name}</p>
        </div>
      </div>
    )
  }

  if (!showPicker && stationId) {
    return (
      <div className="sm:col-span-2">
        <FieldLabel error={error}>Responsible Station</FieldLabel>
        <input
          className={fieldInputClass(error)}
          value={stations.find((s) => s.id === stationId)?.name ?? suggestedName ?? ''}
          readOnly
          disabled
        />
        <p className="text-xs text-slate-500 mt-1">{helper}</p>
      </div>
    )
  }

  return (
    <div className="sm:col-span-2">
      <FieldLabel required error={error}>Responsible Station</FieldLabel>
      <select
        className={fieldInputClass(error)}
        value={stationId}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{loading ? 'Loading stations…' : 'Select station'}</option>
        {stations.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.coversDistrict ? ' (covers district)' : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500 mt-1">{helper}</p>
    </div>
  )
}
