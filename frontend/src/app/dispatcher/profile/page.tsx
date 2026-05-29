'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dispatcherProfileApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function DispatcherProfilePage() {
  const { profile: cached, refresh } = useDispatcherAccess()
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
      })
      .finally(() => setLoading(false))
  }, [])

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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center text-white text-xl font-black">
          {p?.firstName?.[0]}{p?.lastName?.[0]}
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
