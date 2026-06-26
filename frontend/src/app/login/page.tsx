'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath } from '@/lib/authRedirect'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AaminLogo from '@/components/brand/AaminLogo'
import AuthPortalTopBar, { AuthPortalFooter } from '@/components/auth/AuthPortalTopBar'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login, user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) return

    setIsSubmitting(true)
    setError(null)

    try {
      await login(email, password)
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid credentials. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col">
      <AuthPortalTopBar />

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <AaminLogo size="auth" width={180} priority />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login</h1>
            <p className="text-gray-600">
              Sign in to your Aamin Ambulance account
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email / Username
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your email or username"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
