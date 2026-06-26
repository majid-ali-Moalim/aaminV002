'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { authService } from '@/lib/api'
import PasswordField from '@/components/auth/PasswordField'
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter'
import AuthPortalTopBar, { AuthPortalFooter } from '@/components/auth/AuthPortalTopBar'
import AaminLogo from '@/components/brand/AaminLogo'
import { validateResetPasswordForm } from '@/lib/passwordValidation'
import {
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'

type Step = 'email' | 'otp' | 'password' | 'done'

function maskEmail(value: string) {
  const [local, domain] = value.split('@')
  if (!domain) return value
  const visible = local.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const passwordErrors = useMemo(
    () => validateResetPasswordForm({ password, confirmPassword }),
    [password, confirmPassword],
  )

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setInfo('')
    setOtp('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setInfo(
        `A new 6-digit code was sent to ${maskEmail(email.trim())}. Use only the latest email — older codes will not work. Check spam if needed.`,
      )
      setStep('otp')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send verification code.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await authService.verifyResetOtp(email, otp)
      setStep('password')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (Object.keys(passwordErrors).length > 0) {
      setError(Object.values(passwordErrors)[0])
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(email, password, confirmPassword)
      setStep('done')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col">
        <AuthPortalTopBar />
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Password Updated</h1>
            <p className="text-gray-600 mb-8">Password updated successfully. You can sign in with your new password.</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col">
      <AuthPortalTopBar />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AaminLogo size="auth" width={160} priority />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <p className="text-gray-600">
                {step === 'email' && 'Enter your registered email to receive a 6-digit verification code.'}
                {step === 'otp' && 'Enter the verification code sent to your email. It expires in 10 minutes.'}
                {step === 'password' && 'Create a new secure password for your account.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-bold uppercase tracking-wide">
              {(['email', 'otp', 'password'] as const).map((s, i) => (
                <span
                  key={s}
                  className={`px-3 py-1 rounded-full ${
                    step === s
                      ? 'bg-red-600 text-white'
                      : ['email', 'otp', 'password'].indexOf(step) > i
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i + 1}. {s === 'email' ? 'Email' : s === 'otp' ? 'Verify' : 'Reset'}
                </span>
              ))}
            </div>

            {info && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800">{info}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={sendOtp} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter your registered email"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Verification Code to Email'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={verifyOtp} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="otp"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl tracking-[0.4em] font-mono text-lg focus:ring-2 focus:ring-red-500"
                      placeholder="000000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code from your most recent email. Maximum 5 attempts per code.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={loading}
                  className="w-full text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Resend verification code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtp('')
                    setError('')
                    setInfo('')
                    setStep('email')
                  }}
                  className="w-full text-sm text-gray-500 hover:text-red-600"
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={resetPassword} className="space-y-4">
                <PasswordField
                  id="newPassword"
                  label="New Password"
                  value={password}
                  onChange={setPassword}
                  error={passwordErrors.password}
                  required
                  autoComplete="new-password"
                />
                <PasswordStrengthMeter password={password} />
                <PasswordField
                  id="confirmPassword"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={passwordErrors.confirmPassword}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Updating...' : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>

          <AuthPortalFooter />
        </div>
      </div>
    </div>
  )
}
