'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { driverProfileApi } from '@/lib/driverApi'
import {
  clearAuthTokenCookie,
  isDriverUser,
  syncRoleStores,
} from '@/lib/authRedirect'
import toast from 'react-hot-toast'
import { AlertCircle, Eye, EyeOff, Loader2, Shield, Truck, Phone } from 'lucide-react'

export default function DriverLoginPage() {
  const router = useRouter()
  const { login, user, token, loading: authLoading } = useAuth()
  const { setProfile } = useDriverStore()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (token && user && isDriverUser(user)) {
      router.replace('/driver')
    }
  }, [authLoading, token, user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter your credentials.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await login(form.username.trim(), form.password)

      const stored = localStorage.getItem('user')
      const loggedIn = stored ? JSON.parse(stored) : null
      const accessToken = localStorage.getItem('token')

      if (!isDriverUser(loggedIn)) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        clearAuthTokenCookie()
        setError('Access denied. Driver accounts only.')
        setLoading(false)
        return
      }

      if (accessToken && loggedIn?.id) {
        await syncRoleStores(accessToken, loggedIn)
      }

      try {
        const profile = await driverProfileApi.get()
        setProfile(profile)
      } catch (_) {
        /* dashboard will retry */
      }

      toast.success('Welcome back! Drive safe.', { duration: 3000 })
      router.replace('/driver')
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dl-root">
      <div className="dl-bg">
        <div className="dl-bg-orb dl-bg-orb-1" />
        <div className="dl-bg-orb dl-bg-orb-2" />
        <div className="dl-bg-orb dl-bg-orb-3" />
      </div>

      <div className="dl-container">
        <div className="dl-brand">
          <div className="dl-emblem">
            <span className="dl-cross">✚</span>
          </div>
          <div className="dl-brand-text">
            <h1 className="dl-title">EADS</h1>
            <p className="dl-subtitle">Emergency Ambulance Dispatch System</p>
          </div>
          <div className="dl-role-chip">
            <Truck size={14} />
            <span>Driver Portal</span>
          </div>
        </div>

        <div className="dl-card">
          <div className="dl-card-header">
            <div className="dl-shield">
              <Shield size={22} className="dl-shield-icon" />
            </div>
            <div>
              <h2 className="dl-card-title">Secure Sign In</h2>
              <p className="dl-card-sub">Use your Employee ID, phone, or email</p>
            </div>
          </div>

          {error && (
            <div className="dl-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="dl-form">
            <div className="dl-field">
              <label className="dl-label" htmlFor="driver-username">
                Employee ID / Phone / Email
              </label>
              <input
                id="driver-username"
                name="username"
                type="text"
                className="dl-input"
                placeholder="e.g. EMP-001 or driver@eads.so"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="dl-field">
              <label className="dl-label" htmlFor="driver-password">
                Password
              </label>
              <div className="dl-input-wrap">
                <input
                  id="driver-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  className="dl-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="dl-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="driver-login-btn"
              className="dl-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="dl-spin" />
                  Authenticating…
                </>
              ) : (
                'Sign In to Driver Portal'
              )}
            </button>
          </form>
        </div>

        <div className="dl-footer">
          <Phone size={13} />
          <span>Emergency dispatch line: <strong>+252 XX XXXXXXX</strong></span>
        </div>
      </div>
    </div>
  )
}
