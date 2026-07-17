'use client'

import { Stethoscope } from 'lucide-react'
import { FieldLabel } from './ui'

type Props = {
  needsNurse: boolean | null
  error?: string
  onChange: (value: boolean) => void
}

export default function NurseRequiredField({ needsNurse, error, onChange }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <FieldLabel required error={error}>Nurse required?</FieldLabel>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        <Stethoscope className="w-4 h-4 text-violet-600 shrink-0" />
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              needsNurse === true
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-l border-slate-200 transition ${
              needsNurse === false
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}
