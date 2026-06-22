'use client'

import { CalendarRange } from 'lucide-react'
import {
  DATE_FILTER_PRESETS,
  type DateFilterPreset,
  type DateRange,
} from '@/lib/emergency/dateFilters'

type Props = {
  preset: DateFilterPreset
  customFrom: string
  customTo: string
  range: DateRange
  onPresetChange: (preset: DateFilterPreset) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}

export default function EmergencyDateFilter({
  preset,
  customFrom,
  customTo,
  range,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <CalendarRange className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-600">Date Filter</p>
            <p className="text-sm text-slate-500">
              {range.from.toLocaleDateString()} — {range.to.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {DATE_FILTER_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPresetChange(item.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              preset === item.id
                ? 'bg-red-600 text-white shadow-md shadow-red-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-red-200 hover:text-red-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <label className="flex-1 text-xs font-bold text-slate-500 uppercase">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500"
            />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-500 uppercase">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500"
            />
          </label>
        </div>
      )}
    </div>
  )
}
