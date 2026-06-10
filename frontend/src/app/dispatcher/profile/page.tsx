'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, User, Shield, RefreshCw } from 'lucide-react'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import { Button } from '@/components/ui/button'
import { dispatcherProfileApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function DispatcherProfilePage() {
  const { profile: cached, refresh } = useDispatcherAccess()
  const { permissions, loading: permLoading, refresh: refreshPermissions } = usePermissions()
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ phone: '', alternatePhone: '', emergencyContactName: '', emergencyPhone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatcherProfileApi
      .get()
      .then((p) => {
        setProfile(p)
        setForm({
          phone: p.phone || '',
          alternatePhone: p.alternatePhone || '',
          emergencyContactName: p.emergencyContactName || '',
          emergencyPhone: p.emergencyPhone || '',
        })
        if (p.activePermissionKeys?.length) {
          void refreshPermissions()
        }
      })
      .finally(() => setLoading(false))
  }, [refreshPermissions])

  const handleSave = async () => {
    setSaving(true)
    try {
      await dispatcherProfileApi.update(form)
      toast.success('Profile updated')
      await refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>
  }

  const p = profile || cached

  return (
    <div className="space-y-6 pb-20 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Your admin-issued dispatcher credentials and contact info</p>
      </div>

      <div className="bg-white rounded-2xl border border-red-50 p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg ring-2 ring-red-600 overflow-hidden bg-red-600 shrink-0">
          {profilePhotoUrl(p?.profilePhoto) ? (
            <img
              src={profilePhotoUrl(p?.profilePhoto)}
              alt={`${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xl font-black">
              {p?.firstName?.[0]}
              {p?.lastName?.[0]}
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-black">{p?.firstName} {p?.lastName}</p>
          <p className="text-sm text-red-600 font-bold">{p?.employeeCode}</p>
          <p className="text-xs text-slate-500">{p?.user?.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-red-50 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
          <User className="w-4 h-4" />
          Credentials (read-only)
        </h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Username</dt><dd className="font-bold">{p?.user?.username}</dd></div>
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Status</dt><dd className="font-bold">{p?.status}</dd></div>
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Shift</dt><dd className="font-bold">{p?.shiftStatus}</dd></div>
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Cert ID</dt><dd className="font-bold">{p?.licenseNumber || '—'}</dd></div>
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Cert Expiry</dt><dd className="font-bold">{p?.licenseExpiryDate ? format(new Date(p.licenseExpiryDate), 'MMM d, yyyy') : '—'}</dd></div>
          <div><dt className="text-slate-400 text-xs font-bold uppercase">Station</dt><dd className="font-bold">{p?.station?.name || '—'}</dd></div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-red-50 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" />
            My Access Permissions
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => refreshPermissions()}
            disabled={permLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${permLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {permLoading && permissions.length === 0 ? (
          <p className="text-sm text-slate-500">Loading permissions…</p>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No extra permissions granted yet. Your administrator can assign access from User Access.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {permissions.map((key) => (
              <li
                key={key}
                className="text-sm font-semibold text-slate-800 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 border border-slate-100"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {getPermissionLabel(key)}
              </li>
            ))}
          </ul>
        )}
        {permissions.includes('driver.create') && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            You can register new drivers — open{' '}
            <a href="/dispatcher/permissions/granted" className="font-bold underline">
              My Permissions
            </a>{' '}
            or Resources → Drivers.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-red-50 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest">Contact details</h2>
        {(['phone', 'alternatePhone', 'emergencyContactName', 'emergencyPhone'] as const).map((field) => (
          <div key={field}>
            <label className="text-xs font-bold text-slate-500 uppercase">{field.replace(/([A-Z])/g, ' $1')}</label>
            <input
              className="mt-1 w-full h-11 px-3 rounded-xl border border-red-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/10 outline-none text-sm font-medium"
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            />
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-red-600 hover:bg-red-700 rounded-xl font-black">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Contact Info
        </Button>
      </div>
    </div>
  )
}
