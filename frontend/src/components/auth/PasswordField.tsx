'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  variant?: 'light' | 'dark'
}

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required,
  disabled,
  autoComplete,
  variant = 'light',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const isDark = variant === 'dark'

  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-xs font-bold uppercase mb-1 ${
          isDark ? 'text-zinc-500' : 'text-slate-500'
        }`}
      >
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          className={`mt-1 w-full h-11 px-3 pr-11 rounded-xl border outline-none text-sm font-medium focus:ring-2 focus:ring-red-500/10 ${
            isDark
              ? `bg-zinc-900/50 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-red-600 ${
                  error ? 'border-red-500' : 'border-zinc-800'
                }`
              : `bg-slate-50 focus:bg-white ${error ? 'border-red-300' : 'border-gray-200'}`
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${
            isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'
          }`}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error ? (
        <p className={`mt-1 text-xs font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      ) : null}
    </div>
  )
}
