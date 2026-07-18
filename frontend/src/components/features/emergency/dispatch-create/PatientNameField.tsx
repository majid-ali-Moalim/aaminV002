'use client'

import { UNKNOWN_PATIENT_NAME } from '@/lib/emergency/patientName'
import { FieldLabel, fieldInputClass } from './ui'

type Props = {
  value: string
  error?: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  showUnknownButton?: boolean
}

export default function PatientNameField({
  value,
  error,
  onChange,
  label = 'Patient Name',
  placeholder = 'Full name or UNKNOWN',
  showUnknownButton = true,
}: Props) {
  const isUnknown = value.trim().toUpperCase() === UNKNOWN_PATIENT_NAME

  return (
    <div>
      <FieldLabel required error={error}>{label}</FieldLabel>
      <div className="flex gap-2">
        <input
          className={fieldInputClass(error)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {showUnknownButton && (
        <button
          type="button"
          onClick={() => onChange(UNKNOWN_PATIENT_NAME)}
          className={`shrink-0 px-3 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition ${
            isUnknown
              ? 'border-slate-700 bg-slate-800 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          Unknown
        </button>
        )}
      </div>
    </div>
  )
}
