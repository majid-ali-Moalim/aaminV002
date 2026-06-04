'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath } from '@/lib/authRedirect'
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login, user, token, loading } = useAuth()
  const router = useRouter()

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
      // AuthContext.login() handles the redirect based on role internally
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Emergency Ambulance Dispatch System
          </h1>
          <p className="text-gray-600">
            Centralized Authentication Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
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

            {/* Password Field */}
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

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
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
          </form>

          {/* Role Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Supported User Roles:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Admin</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Dispatcher</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Driver</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Nurse</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Manager</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center">
                  <span className="font-medium">Hospital</span>
                </div>
                <div className="bg-gray-50 rounded px-3 py-2 text-center col-span-2">
                  <span className="font-medium">Patient</span>
                </div>
              </div>
            </div>
          </div>

          {/* Help Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact your system administrator
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2024 Emergency Ambulance Dispatch System. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Secure authentication portal for authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  )
}
