'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Camera, Loader2, LogOut, Save, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import { authService, uploadService } from '@/lib/api'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import { getSomaliaLicenseClassLabel } from '@/lib/drivers/somaliaDriverLicense'
import ChangePasswordCard from '@/components/auth/ChangePasswordCard'
import SecurityActivityCard from '@/components/auth/SecurityActivityCard'

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

const inputClass =
  'mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/10 outline-none text-sm font-medium'

export default function DriverProfilePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const { isAuthenticated, profile, setProfile } = useDriverStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseClass, setLicenseClass] = useState<string | null>(null)
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<string | null>(null)
  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [securityRefreshKey, setSecurityRefreshKey] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    authService
      .getMe()
      .then((me: any) => {
        const emp = me.employee
        setUsername(me.username ?? '')
        setEmail(me.email ?? '')
        setEmployeeCode(emp?.employeeCode ?? '')
        setLicenseNumber(emp?.licenseNumber ?? '')
        setLicenseClass(emp?.licenseClass ?? null)
        setLicenseExpiryDate(emp?.licenseExpiryDate ?? null)
        setNationalId(emp?.nationalId ?? '')
        setForm({
          firstName: emp?.firstName ?? '',
          lastName: emp?.lastName ?? '',
          phone: emp?.phone ?? '',
          alternatePhone: emp?.alternatePhone ?? '',
          profilePhoto: emp?.profilePhoto ?? '',
          emergencyContactName: emp?.emergencyContactName ?? '',
          emergencyPhone: emp?.emergencyPhone ?? '',
        })
        if (profile) {
          setProfile({
            ...profile,
            firstName: emp?.firstName,
            lastName: emp?.lastName,
            phone: emp?.phone,
            emergencyContactName: emp?.emergencyContactName,
            emergencyPhone: emp?.emergencyPhone,
            profilePhoto: emp?.profilePhoto,
            licenseNumber: emp?.licenseNumber,
            licenseClass: emp?.licenseClass,
            licenseExpiryDate: emp?.licenseExpiryDate,
            nationalId: emp?.nationalId,
          })
        }
      })
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setProfile({
        ...(profile || { shiftStatus: 'OFF_DUTY', status: 'ACTIVE' }),
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        emergencyContactName: form.emergencyContactName,
        emergencyPhone: form.emergencyPhone,
        profilePhoto: form.profilePhoto,
      })
      toast.success('Profile saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = () => {
    logout()
    router.push('/driver/login')
  }

  if (loading) {
    return (
      <DriverPageLayout title="Profile" lightTheme>
        <div className="flex justify-center py-24">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>
      </DriverPageLayout>
    )
  }

  const photoSrc = profilePhotoUrl(form.profilePhoto)
  const displayName = `${form.firstName} ${form.lastName}`.trim() || username || 'Driver'

  return (
    <DriverPageLayout title="Profile" lightTheme>
      <div className="space-y-6 pb-20 max-w-2xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            Update your photo, contact information, and security settings
          </p>
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
              <p className="text-sm text-red-600 font-bold">{employeeCode || 'Driver'}</p>
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
              <dd className="font-bold">{username || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs font-bold uppercase">Email</dt>
              <dd className="font-bold">{email || '—'}</dd>
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
                  className={inputClass}
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
                className={inputClass}
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

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Credentials & License
          </h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-400 text-xs font-bold uppercase">License Number</dt>
              <dd className="font-bold">{licenseNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs font-bold uppercase">License Class</dt>
              <dd className="font-bold text-sm leading-snug">{getSomaliaLicenseClassLabel(licenseClass)}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs font-bold uppercase">License Expiry</dt>
              <dd className="font-bold">
                {licenseExpiryDate
                  ? new Date(licenseExpiryDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs font-bold uppercase">National ID</dt>
              <dd className="font-bold">{nationalId || '—'}</dd>
            </div>
          </dl>
        </div>

        <ChangePasswordCard onSuccess={() => setSecurityRefreshKey((k) => k + 1)} />
        <SecurityActivityCard refreshKey={securityRefreshKey} />

        <Button
          type="button"
          variant="outline"
          onClick={handleSignOut}
          className="w-full h-11 rounded-xl font-black border-gray-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </DriverPageLayout>
  )
}
