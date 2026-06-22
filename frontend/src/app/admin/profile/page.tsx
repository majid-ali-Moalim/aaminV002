'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService, uploadService } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import ChangePasswordCard from '@/components/auth/ChangePasswordCard'
import SecurityActivityCard from '@/components/auth/SecurityActivityCard'
import toast from 'react-hot-toast'

type ProfileForm = {
  firstName: string
  lastName: string
  phone: string
  alternatePhone: string
  profilePhoto: string
  emergencyContactName: string
  emergencyPhone: string
}

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  phone: '',
  alternatePhone: '',
  profilePhoto: '',
  emergencyContactName: '',
  emergencyPhone: '',
}

export default function AdminProfilePage() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [roleLabel, setRoleLabel] = useState('Administrator')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [securityRefreshKey, setSecurityRefreshKey] = useState(0)

  useEffect(() => {
    authService
      .getMe()
      .then((me: any) => {
        const emp = me.employee
        setUsername(me.username ?? '')
        setEmail(me.email ?? '')
        setRoleLabel(emp?.employeeRole?.name ?? me.role ?? 'Admin')
        setForm({
          firstName: emp?.firstName ?? '',
          lastName: emp?.lastName ?? '',
          phone: emp?.phone ?? '',
          alternatePhone: emp?.alternatePhone ?? '',
          profilePhoto: emp?.profilePhoto ?? '',
          emergencyContactName: emp?.emergencyContactName ?? '',
          emergencyPhone: emp?.emergencyPhone ?? '',
        })
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handlePhotoPick = async (file: File | null) => {
    if (!file) return
    setUploadingPhoto(true)
    try {
      const res: any = await uploadService.uploadFile(file)
      const url = res?.url ?? ''
      setForm((f) => ({ ...f, profilePhoto: url }))
      toast.success('Photo uploaded — save profile to apply')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      await authService.updateMe(form)
      await refreshUser()
      toast.success('Profile saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  const photoSrc = profilePhotoUrl(form.profilePhoto)
  const displayName = `${form.firstName} ${form.lastName}`.trim() || user?.username || 'Admin'

  return (
    <div className="space-y-6 pb-20 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Update your photo, contact information, and security settings</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-28 h-28 rounded-2xl border-2 border-white shadow-lg ring-2 ring-red-600 overflow-hidden bg-red-600 shrink-0 group"
            aria-label="Upload profile photo"
          >
            {photoSrc ? (
              <img src={photoSrc} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploadingPhoto ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoPick(e.target.files?.[0] ?? null)}
          />
          <div className="text-center sm:text-left flex-1">
            <p className="text-lg font-black text-slate-900">{displayName}</p>
            <p className="text-sm text-red-600 font-bold">{roleLabel}</p>
            <p className="text-xs text-slate-500 mt-1">{email}</p>
            <p className="text-[10px] text-slate-400 mt-2">Tap the photo to upload a new image (max 5MB)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest">Account (read-only)</h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400 text-xs font-bold uppercase">Username</dt>
            <dd className="font-bold">{username}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs font-bold uppercase">Email</dt>
            <dd className="font-bold">{email}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest">Personal information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(['firstName', 'lastName'] as const).map((field) => (
            <div key={field}>
              <label className="text-xs font-bold text-slate-500 uppercase">
                {field === 'firstName' ? 'First name' : 'Last name'} *
              </label>
              <input
                className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/10 outline-none text-sm font-medium"
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {(['phone', 'alternatePhone', 'emergencyContactName', 'emergencyPhone'] as const).map((field) => (
          <div key={field}>
            <label className="text-xs font-bold text-slate-500 uppercase">
              {field.replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/10 outline-none text-sm font-medium"
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            />
          </div>
        ))}
        <Button
          onClick={handleSave}
          disabled={saving || uploadingPhoto}
          className="w-full h-11 bg-red-600 hover:bg-red-700 rounded-xl font-black"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </div>

      <ChangePasswordCard onSuccess={() => setSecurityRefreshKey((k) => k + 1)} />
      <SecurityActivityCard refreshKey={securityRefreshKey} />
    </div>
  )
}
