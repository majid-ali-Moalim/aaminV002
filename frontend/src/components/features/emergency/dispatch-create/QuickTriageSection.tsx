'use client'

import { HeartPulse } from 'lucide-react'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
} from '@/lib/emergency/triageOptions'
import { SectionCard } from './ui'
import type { EmergencyDispatchForm } from './types'

function StatusOptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                selected
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Props = {
  form: Pick<
    EmergencyDispatchForm,
    'consciousStatus' | 'breathingStatus' | 'bleedingStatus' | 'needsOxygen' | 'needsStretcher'
  >
  onChange: (patch: Partial<EmergencyDispatchForm>) => void
}

export default function QuickTriageSection({ form, onChange }: Props) {
  return (
    <SectionCard title="Quick Triage" icon={HeartPulse} iconBg="bg-rose-100 text-rose-600">
      <p className="text-sm text-slate-600 mb-4">
        Capture vital signs at intake — helps dispatch assign the right crew and equipment.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <StatusOptionGroup
          label="Consciousness"
          value={form.consciousStatus}
          options={CONSCIOUS_STATUS_OPTIONS}
          onChange={(consciousStatus) => onChange({ consciousStatus })}
        />
        <StatusOptionGroup
          label="Breathing"
          value={form.breathingStatus}
          options={BREATHING_STATUS_OPTIONS}
          onChange={(breathingStatus) => onChange({ breathingStatus })}
        />
        <StatusOptionGroup
          label="Bleeding"
          value={form.bleedingStatus}
          options={BLEEDING_STATUS_OPTIONS}
          onChange={(bleedingStatus) => onChange({ bleedingStatus })}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-slate-100">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.needsOxygen}
            onChange={(e) => onChange({ needsOxygen: e.target.checked })}
            className="h-4 w-4 accent-red-600 rounded"
          />
          Needs oxygen
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.needsStretcher}
            onChange={(e) => onChange({ needsStretcher: e.target.checked })}
            className="h-4 w-4 accent-red-600 rounded"
          />
          Needs stretcher
        </label>
      </div>
    </SectionCard>
  )
}
