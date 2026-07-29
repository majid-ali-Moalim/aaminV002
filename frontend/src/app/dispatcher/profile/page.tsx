'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Camera,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Radio,
  Save,
  Shield,
  Truck,
  User,
  Users,
  Stethoscope,
  Briefcase,
  BadgeCheck,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authService, uploadService } from '@/lib/api'
import { dispatcherDashboardApi, dispatcherProfileApi } from '@/lib/dispatcherApi'
import { useAuth } from '@/context/AuthContext'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import ChangePasswordCard from '@/components/auth/ChangePasswordCard'
import SecurityActivityCard from '@/components/auth/SecurityActivityCard'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { getStaffStatusLabel, getStaffStatusStyles } from '@/lib/staff/status'
import { activeShiftLabel } from '@/lib/employment/shiftTypes'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

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

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string | null
  icon?: typeof User
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-red-500" />}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900">{value || '—'}</p>
    </div>
  )
}

export default function DispatcherProfilePage() {
  const { refreshUser } = useAuth()
  const { refresh } = useDispatcherAccess()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [securityRefreshKey, setSecurityRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([dispatcherProfileApi.get(), dispatcherDashboardApi.getStats()])
      .then(([prof, dashStats]) => {
        setProfile(prof)
        setStats(dashStats)
        setForm({
          firstName: prof?.firstName ?? '',
          lastName: prof?.lastName ?? '',
          phone: prof?.phone ?? '',
          alternatePhone: prof?.alternatePhone ?? '',
          profilePhoto: prof?.profilePhoto ?? '',
          emergencyContactName: prof?.emergencyContactName ?? '',
          emergencyPhone: prof?.emergencyPhone ?? '',
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
      await Promise.all([refreshUser(), refresh()])
      const updated = await dispatcherProfileApi.get()
      setProfile(updated)
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

  const username = profile?.user?.username ?? ''
  const email = profile?.user?.email ?? ''
  const employeeCode = profile?.employeeCode ?? ''
  const roleLabel = profile?.employeeRole?.name ?? 'Dispatcher'
  const shiftStatus = profile?.shiftStatus ?? stats?.shiftStatus ?? ''
  const shiftStyles = getStaffStatusStyles(shiftStatus)
  const station = profile?.station
  const regionName = station?.region?.name ?? stats?.region ?? ''
  const districtName = station?.district?.name ?? ''
  const departmentName = profile?.department?.name ?? ''
  const photoSrc = profilePhotoUrl(form.profilePhoto)
  const displayName = `${form.firstName} ${form.lastName}`.trim() || username || 'Dispatcher'

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your dispatcher identity, assigned station, and operational context
        </p>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-red-800 to-red-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-28 h-28 rounded-2xl border-2 border-white/30 shadow-lg overflow-hidden bg-white/10 shrink-0 group"
            aria-label="Upload profile photo"
          >
            {photoSrc ? (
              <img src={photoSrc} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-white/80" />
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
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-1">
              Dispatcher Profile
            </p>
            <h2 className="text-2xl font-black">{displayName}</h2>
            <p className="text-red-100 font-bold mt-1">{employeeCode || roleLabel}</p>
            <p className="text-sm text-red-100/90 mt-1">{email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${shiftStyles.badge}`}
              >
                {getStaffStatusLabel(shiftStatus) || 'Shift unknown'}
              </span>
              {station?.name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 border border-white/20">
                  <Building2 className="w-3.5 h-3.5" />
                  {station.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Station & assignment */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Station & assignment
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoTile label="Assigned station" value={station?.name} icon={Building2} />
          <InfoTile label="Region" value={regionName} icon={MapPin} />
          <InfoTile label="District" value={districtName} icon={MapPin} />
          <InfoTile label="Department" value={departmentName} icon={Briefcase} />
          <InfoTile label="Station phone" value={station?.phone} icon={Phone} />
          <InfoTile
            label="Station address"
            value={station?.address || station?.description}
            icon={MapPin}
          />
        </div>
        {station?.name && (
          <Link
            href="/dispatcher/resources/resource-status"
            className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            <Activity className="w-4 h-4" />
            View regional resource availability
          </Link>
        )}
      </section>

      {/* Live operations */}
      {stats && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Live operations snapshot
          </h2>
          <p className="text-xs text-slate-500">
            Current shift window: <span className="font-bold text-slate-700">{activeShiftLabel()}</span>
            {stats.region ? ` · Region: ${stats.region}` : ''}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Pending cases', value: stats.pending ?? 0, icon: Clock, tone: 'amber' },
              { label: 'Active missions', value: stats.active ?? 0, icon: Radio, tone: 'red' },
              { label: 'My cases', value: stats.myCases ?? 0, icon: Activity, tone: 'blue' },
              { label: 'Ambulances ready', value: stats.availableAmbulances ?? 0, icon: Truck, tone: 'emerald' },
              { label: 'Crew ready', value: (stats.availableDrivers ?? 0) + (stats.availableNurses ?? 0), icon: Users, tone: 'violet' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <Icon className="w-4 h-4 text-red-500 mb-2" />
                  <p className="text-2xl font-black text-slate-900">{item.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                    {item.label}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/dispatcher/emergency-requests/pending"
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Open pending queue →
            </Link>
            <Link
              href="/dispatcher/resources/ambulance-availability"
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Fleet availability →
            </Link>
          </div>
        </section>
      )}

      {/* Credentials */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Dispatcher credentials
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoTile label="Role" value={roleLabel} icon={BadgeCheck} />
          <InfoTile label="Employee code" value={employeeCode} icon={User} />
          <InfoTile label="Username" value={username} icon={User} />
          <InfoTile label="Certification ID" value={profile?.licenseNumber} icon={Shield} />
          <InfoTile
            label="Cert expiry"
            value={
              profile?.licenseExpiryDate
                ? format(new Date(profile.licenseExpiryDate), 'MMM d, yyyy')
                : null
            }
            icon={Shield}
          />
          <InfoTile label="License status" value={profile?.licenseStatus} icon={Shield} />
          <InfoTile
            label="Employment date"
            value={
              profile?.employmentDate
                ? format(new Date(profile.employmentDate), 'MMM d, yyyy')
                : null
            }
            icon={Briefcase}
          />
          <InfoTile label="Default shift" value={profile?.defaultShift} icon={Clock} />
          <InfoTile
            label="Typical hours"
            value={
              profile?.typicalStartTime && profile?.typicalEndTime
                ? `${profile.typicalStartTime} – ${profile.typicalEndTime}`
                : null
            }
            icon={Clock}
          />
        </div>
      </section>

      {/* Editable personal info */}
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
          className="w-full sm:w-auto h-11 bg-red-600 hover:bg-red-700 rounded-xl font-black px-8"
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
