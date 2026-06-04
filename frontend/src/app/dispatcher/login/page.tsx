'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath, isDispatcherUser, isDispatcherActive } from '@/lib/authRedirect'
import toast from 'react-hot-toast'
import { AlertCircle, Eye, EyeOff, Loader2, Shield, Radio, Phone } from 'lucide-react'

function DispatcherLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, token, loading: authLoading } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'inactive') {
      setError('Your dispatcher account is inactive. Contact your administrator.')
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return
    if (token && user && isDispatcherUser(user) && isDispatcherActive(user)) {
      router.replace('/dispatcher/dashboard')
    }
  }, [authLoading, token, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Enter the username and password provided by your administrator.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login(form.username.trim(), form.password)

      const stored = localStorage.getItem('user')
      const loggedIn = stored ? JSON.parse(stored) : null

      if (!isDispatcherUser(loggedIn)) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError('Access denied. Admin-issued dispatcher credentials only.')
        setLoading(false)
        return
      }

      if (!isDispatcherActive(loggedIn)) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError('Your dispatcher account is inactive. Contact your administrator.')
        setLoading(false)
        return
      }

      toast.success('Welcome to Dispatch Command Center')
      router.replace('/dispatcher/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-200/30 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-900/20 mb-4">
              <Radio className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">EADS</h1>
            <p className="text-sm text-slate-500 mt-1">Emergency Ambulance Dispatch System</p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-black uppercase tracking-wider border border-red-100">
              <Radio className="w-3.5 h-3.5" />
              Dispatcher Portal
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-red-100 shadow-xl shadow-red-900/5 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Secure Sign In</h2>
                <p className="text-xs text-slate-500">Use credentials issued by your administrator</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  className="w-full h-12 px-4 rounded-xl border border-red-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none text-sm font-medium"
                  placeholder="e.g. DIS-001 or dispatcher@eads.so"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full h-12 px-4 pr-12 rounded-xl border border-red-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none text-sm font-medium"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wide shadow-lg shadow-red-900/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  'Sign In to Command Center'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Don&apos;t have credentials? Ask your system administrator to register you under{' '}
              <span className="text-red-600 font-bold">Dispatch Center → Add New Dispatcher</span>.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5 text-red-500" />
            <span>Emergency line: <strong className="text-slate-700">+252 XX XXXXXXX</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DispatcherLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>}>
      <DispatcherLoginForm />
    </Suspense>
  )
}
