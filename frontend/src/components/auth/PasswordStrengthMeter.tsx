'use client'

import {
  getPasswordRequirements,
  getPasswordStrength,
  type PasswordStrength,
} from '@/lib/passwordValidation'

const STRENGTH_META: Record<
  Exclude<PasswordStrength, 'empty'>,
  { label: string; barClass: string; textClass: string }
> = {
  weak: { label: 'Weak', barClass: 'bg-red-500', textClass: 'text-red-600' },
  fair: { label: 'Fair', barClass: 'bg-orange-500', textClass: 'text-orange-600' },
  good: { label: 'Good', barClass: 'bg-yellow-500', textClass: 'text-yellow-700' },
  strong: { label: 'Strong', barClass: 'bg-green-600', textClass: 'text-green-700' },
}

const BAR_WIDTH: Record<Exclude<PasswordStrength, 'empty'>, string> = {
  weak: 'w-1/4',
  fair: 'w-2/4',
  good: 'w-3/4',
  strong: 'w-full',
}

type PasswordStrengthMeterProps = {
  password: string
  showRequirements?: boolean
}

export default function PasswordStrengthMeter({
  password,
  showRequirements = true,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password)
  const requirements = getPasswordRequirements(password)

  if (!password) return null

  const meta = strength !== 'empty' ? STRENGTH_META[strength] : null

  return (
    <div className="space-y-3">
      {meta ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-slate-500 uppercase tracking-wide">Strength</span>
            <span className={`font-bold ${meta.textClass}`}>{meta.label}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${meta.barClass} ${BAR_WIDTH[strength]}`}
            />
          </div>
        </div>
      ) : null}

      {showRequirements ? (
        <ul className="grid sm:grid-cols-2 gap-1.5 text-xs">
          {requirements.map((req) => (
            <li
              key={req.key}
              className={req.met ? 'text-green-700 font-medium' : 'text-slate-400'}
            >
              {req.met ? '✓' : '○'} {req.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
