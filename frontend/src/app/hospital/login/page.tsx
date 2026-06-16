'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { isHospitalUser, clearAuthTokenCookie } from '@/lib/authRedirect'

export default function HospitalLoginPage() {
  const router = useRouter()
  const { login, user, token, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (token && user && isHospitalUser(user)) router.replace('/hospital/dashboard')
  }, [authLoading, token, user, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username.trim(), form.password)
      const stored = localStorage.getItem('user')
      const loggedIn = stored ? JSON.parse(stored) : null
      if (!isHospitalUser(loggedIn)) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        clearAuthTokenCookie()
        setError('Access denied. Hospital accounts only.')
        return
      }
      if (loggedIn?.mustChangePassword) {
        toast('Please change your password', { icon: '🔐' })
        router.replace('/hospital/profile?changePassword=1')
        return
      }
      toast.success('Welcome to Hospital Portal')
      router.replace('/hospital/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hosp-login-page">
      <form onSubmit={submit} className="hosp-login-card">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-teal-600" size={32} />
          <div>
            <h1 className="text-xl font-black text-slate-900">Hospital Portal</h1>
            <p className="text-sm text-slate-500">Emergency coordination login</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Username or email</label>
        <input
          className="w-full mb-4 px-3 py-2.5 rounded-xl border border-slate-200"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          autoComplete="username"
        />
        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
        <div className="relative mb-6">
          <input
            type={showPw ? 'text' : 'password'}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 pr-10"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
          />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="submit" disabled={loading} className="w-full hosp-btn primary justify-center py-3">
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
        </button>
        <div className="flex justify-between mt-4 text-sm">
          <Link href="/hospital/forgot-password" className="text-teal-700 font-semibold">Forgot password?</Link>
          <Link href="/login" className="text-slate-500">Central login</Link>
        </div>
      </form>
    </div>
  )
}
