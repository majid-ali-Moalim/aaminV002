'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Save, User, Phone, MapPin, Shield, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Employee, Department, Station } from '@/types'
import { employeesService, uploadService } from '@/lib/api'
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar'
import { DISPATCHER_QUALIFICATIONS } from '@/lib/dispatcherFormMasterData'

type DispatcherEditModalProps = {
  dispatcher: Employee | null
  open: boolean
  stations: Station[]
  departments: Department[]
  onClose: () => void
  onSaved: (updated: Employee) => void
}

const SHIFT_OPTIONS = [
  { id: 'OFF_DUTY', label: 'Off Duty' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'ON_DUTY', label: 'On Duty' },
  { id: 'UNAVAILABLE', label: 'Unavailable' },
]

export default function DispatcherEditModal({
  dispatcher,
  open,
  stations,
  departments,
  onClose,
  onSaved,
}: DispatcherEditModalProps) {
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    alternatePhone: '',
    stationId: '',
    departmentId: '',
    shiftStatus: 'OFF_DUTY',
    status: 'ACTIVE',
    qualification: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    profilePhoto: '',
  })

  useEffect(() => {
    if (!dispatcher || !open) return
    setForm({
      firstName: dispatcher.firstName || '',
      lastName: dispatcher.lastName || '',
      phone: dispatcher.phone || '',
      alternatePhone: (dispatcher as any).alternatePhone || '',
      stationId: dispatcher.stationId || '',
      departmentId: dispatcher.departmentId || '',
      shiftStatus: dispatcher.shiftStatus || 'OFF_DUTY',
      status: dispatcher.status || 'ACTIVE',
      qualification: (dispatcher as any).qualification || '',
      licenseNumber: dispatcher.licenseNumber || '',
      licenseExpiryDate: dispatcher.licenseExpiryDate
        ? String(dispatcher.licenseExpiryDate).slice(0, 10)
        : '',
      profilePhoto: dispatcher.profilePhoto || '',
    })
  }, [dispatcher, open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !dispatcher) return null

  const patch = (updates: Partial<typeof form>) => setForm((f) => ({ ...f, ...updates }))

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    try {
      setUploadingPhoto(true)
      const res = await uploadService.uploadFile(file)
      patch({ profilePhoto: res.url || '' })
      toast.success('Profile photo updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    if (!form.phone.trim()) {
      toast.error('Phone is required')
      return
    }

    setSaving(true)
    try {
      const updated = await employeesService.update(dispatcher.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || undefined,
        stationId: form.stationId || undefined,
        departmentId: form.departmentId || undefined,
        shiftStatus: form.shiftStatus,
        status: form.status,
        qualification: form.qualification || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined,
        licenseExpiryDate: form.licenseExpiryDate || undefined,
        profilePhoto: form.profilePhoto || undefined,
      })
      toast.success('Dispatcher updated')
      onSaved(updated)
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Update failed'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-100">Edit Dispatcher</p>
            <h2 className="text-lg font-black">{dispatcher.employeeCode || 'DIS-000'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group">
              <EmployeeAvatar
                profilePhoto={form.profilePhoto}
                firstName={form.firstName}
                lastName={form.lastName}
                size="lg"
                gradient="from-red-600 to-red-500"
                className="ring-4 ring-red-100"
              />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              <span className="absolute inset-0 rounded-[2rem] bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploadingPhoto ? (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </span>
            </label>
            <p className="text-xs text-slate-500 font-medium">Click photo to change profile image</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input
                className="field-input"
                value={form.firstName}
                onChange={(e) => patch({ firstName: e.target.value })}
              />
            </Field>
            <Field label="Last Name" required>
              <input
                className="field-input"
                value={form.lastName}
                onChange={(e) => patch({ lastName: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" icon={Phone} required>
              <input className="field-input" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Alternate Phone" icon={Phone}>
              <input
                className="field-input"
                value={form.alternatePhone}
                onChange={(e) => patch({ alternatePhone: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Station" icon={MapPin}>
              <select
                className="field-input"
                value={form.stationId}
                onChange={(e) => patch({ stationId: e.target.value })}
              >
                <option value="">Select station</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select
                className="field-input"
                value={form.departmentId}
                onChange={(e) => patch({ departmentId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Shift Status">
              <select
                className="field-input"
                value={form.shiftStatus}
                onChange={(e) => patch({ shiftStatus: e.target.value })}
              >
                {SHIFT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Account Status">
              <select className="field-input" value={form.status} onChange={(e) => patch({ status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </Field>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Credentials</p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Qualification">
                <select
                  className="field-input"
                  value={form.qualification}
                  onChange={(e) => patch({ qualification: e.target.value })}
                >
                  <option value="">Select qualification</option>
                  {DISPATCHER_QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Certification ID" icon={Shield}>
                  <input
                    className="field-input"
                    value={form.licenseNumber}
                    onChange={(e) => patch({ licenseNumber: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="Cert Expiry">
                  <input
                    type="date"
                    className="field-input"
                    value={form.licenseExpiryDate}
                    onChange={(e) => patch({ licenseExpiryDate: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 p-5 flex gap-3 bg-slate-50/80">
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .field-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
        }
        .field-input:focus {
          border-color: #3b82f6;
          ring: 2px;
          background: white;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string
  required?: boolean
  icon?: typeof User
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
