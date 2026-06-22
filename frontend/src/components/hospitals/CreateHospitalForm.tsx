'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Phone,
  HeartPulse,
  Settings2,
  Loader2,
  CheckCircle2,
  Hash,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { hospitalsService } from '@/lib/api'
import { getCachedDistricts, getCachedRegions, loadLocationReferenceData } from '@/lib/cache/referenceData'
import {
  HOSPITAL_TYPES,
  OWNERSHIP_TYPES,
  CREATE_OPERATIONAL_STATUSES,
  MEDICAL_CAPABILITIES,
  INITIAL_HOSPITAL_FORM,
  validateCreateHospitalForm,
  type CreateHospitalFormData,
  COMMON_EMERGENCY_SHORT_CODES,
} from '@/lib/hospital-registration/constants'

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/80 dark:bg-gray-950/50">
        <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
          <Icon className="w-4 h-4 text-teal-700 dark:text-teal-300" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30'

export default function CreateHospitalForm() {
  const [form, setForm] = useState<CreateHospitalFormData>(INITIAL_HOSPITAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [regions, setRegions] = useState<any[]>(() => getCachedRegions() ?? [])
  const [districts, setDistricts] = useState<any[]>(() => getCachedDistricts() ?? [])
  const [refsLoading, setRefsLoading] = useState(() => !getCachedRegions())
  const [loading, setLoading] = useState(false)
  const [successCode, setSuccessCode] = useState<string | null>(null)

  useEffect(() => {
    loadLocationReferenceData()
      .then(({ regions: r, districts: d }) => {
        setRegions(r)
        setDistricts(d)
      })
      .catch(() => toast.error('Failed to load regions'))
      .finally(() => setRefsLoading(false))
  }, [])

  const filteredDistricts = useMemo(
    () => districts.filter((d) => d.regionId === form.regionId),
    [districts, form.regionId],
  )

  const set = <K extends keyof CreateHospitalFormData>(key: K, value: CreateHospitalFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }

  const toggleCapability = (cap: string) => {
    set(
      'medicalCapabilities',
      form.medicalCapabilities.includes(cap)
        ? form.medicalCapabilities.filter((c) => c !== cap)
        : [...form.medicalCapabilities, cap],
    )
    setErrors((prev) => {
      const next = { ...prev }
      delete next.medicalCapabilities
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateHospitalForm(form)
    setErrors(validation)
    if (Object.keys(validation).length > 0) {
      toast.error('Please fix the highlighted fields')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        hospitalType: form.hospitalType,
        ownershipType: form.ownershipType,
        regionId: form.regionId,
        districtId: form.districtId,
        address: form.address.trim(),
        contactPersonName: form.contactPersonName.trim(),
        contactPersonRole: form.contactPersonRole.trim(),
        primaryPhone: form.primaryPhone.trim(),
        secondaryPhone: form.secondaryPhone.trim() || undefined,
        emergencyShortCode: form.emergencyShortCode.trim() || undefined,
        emergencyHotline: form.emergencyHotline.trim() || undefined,
        email: form.email.trim(),
        website: form.website.trim() || undefined,
        acceptEmergencyCases: form.acceptEmergencyCases,
        medicalCapabilities: form.medicalCapabilities,
        beds: Number(form.beds) || 0,
        icuTotalBeds: Number(form.icuTotalBeds) || 0,
        emergencyBeds: Number(form.emergencyBeds) || 0,
        operatingRooms: Number(form.operatingRooms) || 0,
        capacityStatus: form.capacityStatus,
        operationalStatus: form.operationalStatus,
        available24_7: form.available24_7,
        acceptAmbulanceTransfers: form.acceptAmbulanceTransfers,
        acceptWalkInPatients: INITIAL_HOSPITAL_FORM.acceptWalkInPatients,
        accountUsername: form.accountUsername.trim(),
        accountEmail: form.accountEmail.trim(),
        accountPassword: form.accountPassword,
        hospitalRole: INITIAL_HOSPITAL_FORM.hospitalRole,
        accountStatus: form.accountStatus,
        forcePasswordChange: form.forcePasswordChange,
      }
      const result = await hospitalsService.createHospital(payload)
      setSuccessCode(result.hospitalCode ?? result.id)
      toast.success(`Hospital registered — ${result.hospitalCode}`)
      setForm(INITIAL_HOSPITAL_FORM)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Create Hospital</h1>
            <p className="text-sm text-gray-500">Register a healthcare facility for emergency dispatch operations</p>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="rounded-xl font-bold h-11 px-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Register Hospital
        </Button>
      </div>

      {successCode && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Hospital saved successfully. System ID: <strong>{successCode}</strong>
          </p>
        </div>
      )}

      <SectionCard title="Basic Information" icon={Building2}>
        <Field label="Hospital Name" required error={errors.name} className="md:col-span-2">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mogadishu General Hospital" />
        </Field>
        <Field label="Hospital Code">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${inputCls} pl-10 bg-gray-50 dark:bg-gray-900 text-gray-500`} readOnly value="Auto-generated on save (e.g. HSP-2026-00001)" />
          </div>
        </Field>
        <Field label="Hospital Type" required error={errors.hospitalType}>
          <select className={inputCls} value={form.hospitalType} onChange={(e) => set('hospitalType', e.target.value)}>
            <option value="">Select type</option>
            {HOSPITAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Ownership Type" required error={errors.ownershipType}>
          <select className={inputCls} value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)}>
            <option value="">Select ownership</option>
            {OWNERSHIP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Region" required error={errors.regionId}>
          <select className={inputCls} value={form.regionId} onChange={(e) => { set('regionId', e.target.value); set('districtId', '') }} disabled={refsLoading}>
            <option value="">{refsLoading ? 'Loading regions…' : 'Select region'}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        <Field label="District" required error={errors.districtId}>
          <select className={inputCls} value={form.districtId} onChange={(e) => set('districtId', e.target.value)} disabled={!form.regionId}>
            <option value="">Select district</option>
            {filteredDistricts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Full Address" required error={errors.address} className="md:col-span-2">
          <textarea className={`${inputCls} h-24 py-3 resize-none`} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area, city" />
        </Field>
      </SectionCard>

      <SectionCard title="Contact Information" icon={Phone}>
        <Field label="Contact Person Name" required error={errors.contactPersonName}>
          <input className={inputCls} value={form.contactPersonName} onChange={(e) => set('contactPersonName', e.target.value)} />
        </Field>
        <Field label="Contact Person Role" required error={errors.contactPersonRole}>
          <input className={inputCls} value={form.contactPersonRole} onChange={(e) => set('contactPersonRole', e.target.value)} placeholder="e.g. Hospital Administrator" />
        </Field>
        <Field label="Primary Phone Number" required error={errors.primaryPhone}>
          <input className={inputCls} value={form.primaryPhone} onChange={(e) => set('primaryPhone', e.target.value)} placeholder="+252 61 000 0000" />
        </Field>
        <Field label="Secondary Phone Number" error={errors.secondaryPhone}>
          <input className={inputCls} value={form.secondaryPhone} onChange={(e) => set('secondaryPhone', e.target.value)} />
        </Field>
        <Field label="Emergency Short Code" error={errors.emergencyShortCode}>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_EMERGENCY_SHORT_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => set('emergencyShortCode', code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  form.emergencyShortCode === code
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          <input className={inputCls} value={form.emergencyShortCode} onChange={(e) => set('emergencyShortCode', e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="999, 112, 997" maxLength={5} />
          <p className="text-xs text-gray-400 mt-1">Short dial code (2–5 digits). Required if no full hotline.</p>
        </Field>
        <Field label="Emergency Hotline (full number)" error={errors.emergencyHotline}>
          <input className={inputCls} value={form.emergencyHotline} onChange={(e) => set('emergencyHotline', e.target.value)} placeholder="+252 61 000 0000 (optional if short code set)" />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Website">
          <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
        </Field>
      </SectionCard>

      <SectionCard title="Emergency Eligibility" icon={HeartPulse}>
        <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/30">
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">Accept Emergency Cases</p>
            <p className="text-xs text-gray-500 mt-0.5">When disabled, hospital is hidden from emergency assignment lists</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.acceptEmergencyCases}
            onClick={() => set('acceptEmergencyCases', !form.acceptEmergencyCases)}
            className={`relative w-12 h-7 rounded-full transition-colors ${form.acceptEmergencyCases ? 'bg-teal-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.acceptEmergencyCases ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </SectionCard>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-gray-50/80 dark:bg-gray-950/50">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-teal-700 dark:text-teal-300" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">Medical Capability Tags</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MEDICAL_CAPABILITIES.map((cap) => (
              <label key={cap} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-950/50">
                <input
                  type="checkbox"
                  checked={form.medicalCapabilities.includes(cap)}
                  onChange={() => toggleCapability(cap)}
                  className="w-4 h-4 rounded accent-teal-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{cap}</span>
              </label>
            ))}
          </div>
          {errors.medicalCapabilities && <p className="text-xs text-red-600 mt-3">{errors.medicalCapabilities}</p>}
        </div>
      </section>

      <SectionCard title="Capacity Information" icon={Settings2}>
        <Field label="Emergency Beds"><input type="number" className={inputCls} value={form.emergencyBeds} onChange={(e) => set('emergencyBeds', e.target.value)} /></Field>
        <Field label="ICU Beds"><input type="number" className={inputCls} value={form.icuTotalBeds} onChange={(e) => set('icuTotalBeds', e.target.value)} /></Field>
        <Field label="Total Beds"><input type="number" className={inputCls} value={form.beds} onChange={(e) => set('beds', e.target.value)} /></Field>
        <Field label="Operating Rooms"><input type="number" className={inputCls} value={form.operatingRooms} onChange={(e) => set('operatingRooms', e.target.value)} /></Field>
        <Field label="Current Capacity Status" className="md:col-span-2">
          <select className={inputCls} value={form.capacityStatus} onChange={(e) => set('capacityStatus', e.target.value)}>
            {['Available', 'Limited Capacity', 'Full Capacity'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Operational Settings" icon={Settings2}>
        <Field label="Operational Status" required className="md:col-span-2">
          <div className="flex flex-wrap gap-3">
            {CREATE_OPERATIONAL_STATUSES.map((s) => (
              <label key={s} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-bold transition-colors ${form.operationalStatus === s ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                <input type="radio" name="operationalStatus" value={s} checked={form.operationalStatus === s} onChange={() => set('operationalStatus', s)} className="accent-teal-600" />
                {s}
              </label>
            ))}
          </div>
        </Field>
        {[
          ['available24_7', 'Available 24/7'],
          ['acceptAmbulanceTransfers', 'Accept Ambulance Transfers'],
        ].map(([key, label]) => (
          <label key={key} className="md:col-span-2 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form[key as keyof CreateHospitalFormData] as boolean} onChange={(e) => set(key as keyof CreateHospitalFormData, e.target.checked as any)} />
            {label}
          </label>
        ))}
      </SectionCard>

      <SectionCard title="Hospital Portal Account" icon={Settings2}>
        <Field label="Username" required error={errors.accountUsername}><input className={inputCls} value={form.accountUsername} onChange={(e) => set('accountUsername', e.target.value)} /></Field>
        <Field label="Email Login" required error={errors.accountEmail}><input type="email" className={inputCls} value={form.accountEmail} onChange={(e) => set('accountEmail', e.target.value)} /></Field>
        <Field label="Temporary Password" required error={errors.accountPassword}><input type="password" className={inputCls} value={form.accountPassword} onChange={(e) => set('accountPassword', e.target.value)} /></Field>
        <Field label="Confirm Password" required error={errors.accountPasswordConfirm}><input type="password" className={inputCls} value={form.accountPasswordConfirm} onChange={(e) => set('accountPasswordConfirm', e.target.value)} /></Field>
        <Field label="Account Status">
          <select className={inputCls} value={form.accountStatus} onChange={(e) => set('accountStatus', e.target.value)}>
            {['Active', 'Suspended', 'Pending Activation'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <label className="md:col-span-2 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.forcePasswordChange} onChange={(e) => set('forcePasswordChange', e.target.checked)} />
          Force password change on first login
        </label>
      </SectionCard>

      <div className="flex justify-end pb-8">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold h-11 px-8">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Register Hospital
        </Button>
      </div>
    </form>
  )
}
