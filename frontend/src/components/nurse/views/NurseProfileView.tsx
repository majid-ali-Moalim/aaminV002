'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Loader2, Phone, Save, Shield, User } from 'lucide-react'
import { authService, nursesService, uploadService } from '@/lib/api'
import { validateProfilePhotoFile } from '@/lib/driverFormValidation'
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'

export default function NurseProfileView() {
  const { nurseId, firstName, lastName, email, username } = useNurseEmployee()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    phone: '',
    alternatePhone: '',
    emergencyContactName: '',
    emergencyPhone: '',
  })

  useEffect(() => {
    if (!nurseId) {
      setLoading(false)
      return
    }
    nursesService
      .getById(nurseId)
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
  }, [nurseId])

  const save = async () => {
    setSaving(true)
    try {
      await authService.updateMe(form as Record<string, unknown>)
      toast.success('Profile updated')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const error = validateProfilePhotoFile(file)
    if (error) {
      toast.error(error)
      e.target.value = ''
      return
    }

    setUploadingPhoto(true)
    try {
      const uploaded = await uploadService.uploadFile(file)
      const url = uploaded?.url
      if (!url) throw new Error('Upload returned no URL')

      await authService.updateMe({ profilePhoto: url })
      toast.success('Profile photo updated')
      if (nurseId) {
        const p = await nursesService.getById(nurseId)
        setProfile(p)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not upload photo')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  const p = profile || {}
  const photo = profilePhotoUrl(p.profilePhoto)
  const name = [p.firstName || firstName, p.lastName || lastName].filter(Boolean).join(' ')

  return (
    <div className="nurse-profile-grid">
      <section className="nurse-profile-hero">
        <button
          type="button"
          className="nurse-profile-photo"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <Loader2 className="animate-spin text-white" size={28} />
          ) : photo ? (
            <img src={photo} alt={name} />
          ) : (
            <span>{getEmployeeInitials(p.firstName || firstName, p.lastName || lastName)}</span>
          )}
          <span className="nurse-photo-edit">{uploadingPhoto ? 'Uploading…' : 'Change photo'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <div>
          <h2 className="text-xl font-black text-white">{name || 'Nurse'}</h2>
          <p className="text-red-400 font-bold text-sm">{p.employeeCode || 'NUR-000'}</p>
          <p className="text-zinc-500 text-sm mt-1">{email || username}</p>
          <p className="text-zinc-400 text-xs mt-2">Shift: {p.shiftStatus || '—'} · Status: {p.status || 'ACTIVE'}</p>
        </div>
      </section>

      <section className="nurse-form-card">
        <h3 className="flex items-center gap-2 font-bold text-white mb-4">
          <Shield size={18} className="text-red-500" />
          Credentials
        </h3>
        <dl className="nurse-dl-grid">
          <div><dt>License</dt><dd>{p.licenseNumber || '—'}</dd></div>
          <div><dt>License expiry</dt><dd>{p.licenseExpiryDate ? new Date(p.licenseExpiryDate).toLocaleDateString() : '—'}</dd></div>
          <div><dt>Qualification</dt><dd>{p.qualification || '—'}</dd></div>
          <div><dt>Specialization</dt><dd>{p.specialization || '—'}</dd></div>
          <div><dt>Department</dt><dd>{p.department?.name || p.departmentId || '—'}</dd></div>
          <div><dt>Station</dt><dd>{p.station?.name || '—'}</dd></div>
        </dl>
      </section>

      <section className="nurse-form-card">
        <h3 className="flex items-center gap-2 font-bold text-white mb-4">
          <Phone size={18} className="text-red-500" />
          Contact (editable)
        </h3>
        <div className="nurse-form-grid">
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Alternate phone
            <input value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
          </label>
          <label>
            Emergency contact
            <input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
          </label>
          <label>
            Emergency phone
            <input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          </label>
        </div>
        <button type="button" className="nurse-btn primary mt-4" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save contact info
        </button>
      </section>

      <section className="nurse-form-card">
        <h3 className="flex items-center gap-2 font-bold text-white mb-4">
          <Award size={18} className="text-red-500" />
          Professional info
        </h3>
        <dl className="nurse-dl-grid">
          <div><dt>Employment type</dt><dd>{p.employmentType || '—'}</dd></div>
          <div><dt>Join date</dt><dd>{p.joinDate ? new Date(p.joinDate).toLocaleDateString() : '—'}</dd></div>
          <div><dt>Experience</dt><dd>{p.yearsOfExperience != null ? `${p.yearsOfExperience} yrs` : '—'}</dd></div>
          <div><dt>Blood group</dt><dd>{p.bloodGroup || '—'}</dd></div>
          <div><dt>Emergency care trained</dt><dd>{p.emergencyCareTrained ? 'Yes' : 'No'}</dd></div>
          <div><dt>Assigned ambulance</dt><dd>{p.assignedAmbulance?.ambulanceNumber || '—'}</dd></div>
        </dl>
      </section>

      <section className="nurse-form-card span-2">
        <h3 className="flex items-center gap-2 font-bold text-white mb-2">
          <User size={18} className="text-red-500" />
          Account
        </h3>
        <p className="text-sm text-zinc-400">Username: {username || p.user?.username || '—'}</p>
        <p className="text-sm text-zinc-400">Email: {email || p.user?.email || '—'}</p>
        {p.address && <p className="text-sm text-zinc-400 mt-2">Address: {p.address}</p>}
      </section>
    </div>
  )
}
