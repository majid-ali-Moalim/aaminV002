'use client'

import { useMemo, useState } from 'react'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PasswordField from '@/components/auth/PasswordField'
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter'
import { authService } from '@/lib/api'
import { validateChangePasswordForm } from '@/lib/passwordValidation'
import toast from 'react-hot-toast'

const EMPTY = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function ChangePasswordCard({
  onSuccess,
  variant = 'light',
}: {
  onSuccess?: () => void
  variant?: 'light' | 'dark'
}) {
  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const errors = useMemo(() => validateChangePasswordForm(form), [form])
  const showError = (field: keyof typeof EMPTY) => (touched[field] ? errors[field] : undefined)
  const canSubmit =
    !submitting &&
    form.currentPassword &&
    form.newPassword &&
    form.confirmPassword &&
    Object.keys(errors).length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    setServerError('')

    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await authService.changePassword(form)
      setForm(EMPTY)
      setTouched({})
      toast.success('Password updated successfully.')
      onSuccess?.()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update password.'
      setServerError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const isDark = variant === 'dark'

  return (
    <div
      className={`rounded-2xl border p-6 space-y-5 ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-red-950/50' : 'bg-red-50'
          }`}
        >
          <Lock className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase text-red-500 tracking-widest">Change Password</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Use a strong password. Example:{' '}
            <span className={`font-mono ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>Admin@123</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="currentPassword"
          label="Current Password"
          variant={variant}
          value={form.currentPassword}
          onChange={(v) => {
            setForm((f) => ({ ...f, currentPassword: v }))
            setTouched((t) => ({ ...t, currentPassword: true }))
          }}
          error={showError('currentPassword')}
          required
          autoComplete="current-password"
        />

        <div className="space-y-3">
          <PasswordField
            id="newPassword"
            label="New Password"
            variant={variant}
            value={form.newPassword}
            onChange={(v) => {
              setForm((f) => ({ ...f, newPassword: v }))
              setTouched((t) => ({ ...t, newPassword: true }))
            }}
            error={showError('newPassword')}
            required
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={form.newPassword} />
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          variant={variant}
          value={form.confirmPassword}
          onChange={(v) => {
            setForm((f) => ({ ...f, confirmPassword: v }))
            setTouched((t) => ({ ...t, confirmPassword: true }))
          }}
          error={showError('confirmPassword')}
          required
          autoComplete="new-password"
        />

        {serverError ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              isDark
                ? 'border-red-900 bg-red-950/40 text-red-300'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {serverError}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-11 bg-red-600 hover:bg-red-700 rounded-xl font-black"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 mr-2" />
          )}
          Update Password
        </Button>
      </form>
    </div>
  )
}
