'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath } from '@/lib/authRedirect'
import { isApiNetworkError } from '@/lib/api'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AaminLogo from '@/components/brand/AaminLogo'
import { AuthPortalFooter } from '@/components/auth/AuthPortalTopBar'

function syncAutofillValues(
  setEmail: (v: string) => void,
  setPassword: (v: string) => void,
) {
  const emailEl = document.getElementById('email') as HTMLInputElement | null
  const passEl = document.getElementById('password') as HTMLInputElement | null
  if (emailEl?.value) setEmail(emailEl.value)
  if (passEl?.value) setPassword(passEl.value)
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login, user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const syncFromDom = useCallback(() => {
    syncAutofillValues(setEmail, setPassword)
  }, [])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'account_inactive') {
      setError('Your account is inactive. Contact your system administrator.')
    }
  }, [searchParams])

  useEffect(() => {
    if (!loading && user && token) {
      router.replace(getPostLoginPath(user))
    }
  }, [loading, user, token, router])

  // Browser autofill does not trigger React onChange — sync DOM values after paint
  useEffect(() => {
    syncFromDom()
    const t1 = window.setTimeout(syncFromDom, 100)
    const t2 = window.setTimeout(syncFromDom, 400)
    const onAnim = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart') syncFromDom()
    }
    window.addEventListener('focus', syncFromDom, true)
    document.addEventListener('animationstart', onAnim, true)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('focus', syncFromDom, true)
      document.removeEventListener('animationstart', onAnim, true)
    }
  }, [syncFromDom])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget
    const formEmail = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim() ?? email.trim()
    const formPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value ?? password

    if (!formEmail || !formPassword) {
      setError('Please enter your email/username and password.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await login(formEmail, formPassword)
    } catch (err: unknown) {
      if (isApiNetworkError(err)) {
        setError(
          'Cannot reach the server. Start the backend (npm run start:dev in /backend) and check NEXT_PUBLIC_BACKEND_URL in frontend/.env.local.',
        )
        return
      }
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr?.response?.data?.message ||
        axiosErr?.message ||
        'Invalid credentials. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!loading && user && token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" aria-label="Redirecting" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <AaminLogo size="auth" width={160} priority />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Login</h1>
            <p className="text-slate-600 text-sm">
              Sign in to your Aamin Ambulance account
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email / Username
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="Enter your email or username"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center pt-1">
                <Link href="/forgot-password" className="text-sm font-medium text-red-600 hover:text-red-700">
                  Forgot password?
                </Link>
              </div>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                Need help? Contact{' '}
                <a href="mailto:info@aaminambulance.com" className="text-red-600 hover:underline">
                  info@aaminambulance.com
                </a>
              </p>
            </div>
          </div>

          <AuthPortalFooter />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
