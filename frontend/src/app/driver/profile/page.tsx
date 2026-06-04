'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { driverProfileApi } from '@/lib/driverApi'
import { User, Shield, Phone, FileText, Award, LogOut, CheckCircle2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DriverProfilePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const { isAuthenticated, profile, setProfile } = useDriverStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone: '',
    emergencyContactName: '',
    emergencyPhone: '',
  })

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyPhone: profile.emergencyPhone || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await driverProfileApi.update(form)
      if (profile) {
        setProfile({ ...profile, ...form })
      }
      toast.success('Contact information updated!')
    } catch (_) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = () => {
    logout()
    router.push('/driver/login')
  }

  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Driver'

  // Unified certifications list per specification
  const certifications = [
    'Emergency Driving Certification',
    'Emergency Medical Response Training',
    'Defensive Driving Tactics',
    'Advanced Computer Literacy',
    'Emergency Communication Skills',
    'High-Speed Typing (45 WPM)',
  ]

  return (
    <DriverPageLayout title="Profile" mainClassName="driver-main--split">
      <DriverModuleShell module={getModuleById('profile')!} description="Personal and professional information, account settings, and emergency contacts.">
        {/* Profile Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-xl font-black border-2 border-red-800 shadow-lg shadow-red-900/20">
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </div>
          <div>
            <h3 className="text-base font-black text-white">{fullName}</h3>
            <p className="text-xs text-red-500 font-bold mt-0.5">{profile?.employeeCode || 'EMP-DRV-104'}</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">{profile?.user?.email}</p>
          </div>
        </div>

        {/* Credentials & License (Read-Only) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Credentials & Licenses
          </h4>

          <dl className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-zinc-500 font-bold uppercase">License Number</dt>
              <dd className="font-black text-white mt-1">{profile?.licenseNumber || 'DL-994821-A'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-bold uppercase">License Expiry</dt>
              <dd className="font-black text-white mt-1">Dec 31, 2028</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-bold uppercase">Shift Status</dt>
              <dd className="font-black text-white mt-1">{profile?.shiftStatus || 'OFF_DUTY'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-bold uppercase">Work Status</dt>
              <dd className="font-black text-white mt-1">{profile?.status || 'ACTIVE'}</dd>
            </div>
          </dl>
        </div>

        {/* Certifications & Skills (Unified list per spec) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4" />
            Certifications & Skills
          </h4>

          <ul className="space-y-2">
            {certifications.map((cert, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/50 p-2.5 rounded-xl text-xs font-bold text-zinc-300"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>{cert}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Details Form */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Information
          </h4>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Mobile Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs font-bold text-white outline-none focus:border-red-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Emergency Contact Name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs font-bold text-white outline-none focus:border-red-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Emergency Phone</label>
              <input
                type="text"
                value={form.emergencyPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs font-bold text-white outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-900/20 transition-all mt-4"
            >
              {saving ? 'Saving...' : 'Save Contact Details'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full h-12 bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
