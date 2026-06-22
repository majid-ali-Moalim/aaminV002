'use client'

import { Info } from 'lucide-react'
import {
  SOMALIA_AMBULANCE_LICENSE_CLASSES,
  SOMALIA_DRIVER_LICENSE_CLASSES,
  SOMALIA_LICENSE_ISSUING_AUTHORITY,
  SOMALIA_LICENSE_NUMBER_HINT,
  SOMALIA_LICENSE_VALIDITY_YEARS,
  SOMALIA_NATIONAL_ID_LICENSE_NOTE,
} from '@/lib/drivers/somaliaDriverLicense'

type Props = {
  compact?: boolean
}

export default function SomaliaDriverLicenseInfo({ compact = false }: Props) {
  if (compact) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Somali licenses are valid for {SOMALIA_LICENSE_VALIDITY_YEARS} years and require a National ID. Issued by{' '}
        {SOMALIA_LICENSE_ISSUING_AUTHORITY}
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase text-red-700 tracking-wide">Somalia Driver License</p>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            Standard licenses are valid for <strong>{SOMALIA_LICENSE_VALIDITY_YEARS} years</strong> and are tied to
            your National ID. {SOMALIA_NATIONAL_ID_LICENSE_NOTE}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">{SOMALIA_LICENSE_ISSUING_AUTHORITY}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">License classes</p>
        <ul className="grid sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
          {SOMALIA_DRIVER_LICENSE_CLASSES.map((cls) => (
            <li key={cls.id}>
              <span className="font-bold text-slate-800">{cls.label}:</span> {cls.description}
              {SOMALIA_AMBULANCE_LICENSE_CLASSES.includes(cls.id) ? (
                <span className="ml-1 text-red-600 font-semibold">(ambulance fleet)</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-slate-500 border-t border-red-100 pt-2">{SOMALIA_LICENSE_NUMBER_HINT}</p>
    </div>
  )
}
