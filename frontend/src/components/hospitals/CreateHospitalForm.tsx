'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  Hash,
  Plus,
  Trash2,
  GitBranch,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { hospitalsService } from '@/lib/api'
import { getCachedDistricts, getCachedRegions, loadLocationReferenceData } from '@/lib/cache/referenceData'
import {
  HOSPITAL_TYPES,
  OWNERSHIP_TYPES,
  CREATE_OPERATIONAL_STATUSES,
  INITIAL_HOSPITAL_FORM,
  validateCreateHospitalForm,
  emptyBranch,
  type CreateHospitalFormData,
  type HospitalBranchForm,
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

  const updateBranch = (index: number, patch: Partial<HospitalBranchForm>) => {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }))
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
        operationalStatus: form.operationalStatus,
        branches: form.branches.map((b) => ({
          id: b.id,
          name: b.name.trim(),
          regionId: b.regionId,
          districtId: b.districtId,
          address: b.address.trim(),
          email: b.email.trim(),
          primaryPhone: b.primaryPhone.trim(),
          emergencyShortCode: b.emergencyShortCode.trim() || undefined,
          emergencyHotline: b.emergencyHotline.trim() || undefined,
        })),
      }
      const result = await hospitalsService.registerHospital(payload)
      setSuccessCode(result.hospitalCode ?? result.id)
      toast.success(`Hospital registered — ${result.hospitalCode}`)
      setForm({ ...INITIAL_HOSPITAL_FORM, branches: [emptyBranch()] })
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
            <p className="text-sm text-gray-500">
              Register facility information and branches for dispatch — no portal login created here
            </p>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="rounded-xl font-bold h-11 px-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Hospital
        </Button>
      </div>

      {successCode && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Hospital saved. Code: <strong>{successCode}</strong>
          </p>
        </div>
      )}

      <SectionCard title="Organization" icon={Building2}>
        <Field label="Hospital Name" required error={errors.name} className="md:col-span-2">
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mogadishu General Hospital" />
        </Field>
        <Field label="Hospital Type" required error={errors.hospitalType}>
          <select className={inputCls} value={form.hospitalType} onChange={(e) => set('hospitalType', e.target.value)}>
            <option value="">Select type</option>
            {HOSPITAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Ownership" required error={errors.ownershipType}>
          <select className={inputCls} value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)}>
            <option value="">Select ownership</option>
            {OWNERSHIP_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Head Office Region" required error={errors.regionId}>
          <select className={inputCls} value={form.regionId} onChange={(e) => set('regionId', e.target.value)} disabled={refsLoading}>
            <option value="">Select region</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Head Office District" required error={errors.districtId}>
          <select className={inputCls} value={form.districtId} onChange={(e) => set('districtId', e.target.value)} disabled={!form.regionId}>
            <option value="">Select district</option>
            {filteredDistricts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Head Office Address" required error={errors.address} className="md:col-span-2">
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="Primary Contact" icon={Phone}>
        <Field label="Contact Person" required error={errors.contactPersonName}>
          <input className={inputCls} value={form.contactPersonName} onChange={(e) => set('contactPersonName', e.target.value)} />
        </Field>
        <Field label="Contact Role" required error={errors.contactPersonRole}>
          <input className={inputCls} value={form.contactPersonRole} onChange={(e) => set('contactPersonRole', e.target.value)} />
        </Field>
        <Field label="Primary Phone" required error={errors.primaryPhone}>
          <input className={inputCls} value={form.primaryPhone} onChange={(e) => set('primaryPhone', e.target.value)} />
        </Field>
        <Field label="Secondary Phone" error={errors.secondaryPhone}>
          <input className={inputCls} value={form.secondaryPhone} onChange={(e) => set('secondaryPhone', e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Emergency Short Code" error={errors.emergencyShortCode}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_EMERGENCY_SHORT_CODES.map((code) => (
              <button key={code} type="button" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700" onClick={() => set('emergencyShortCode', code)}>
                {code}
              </button>
            ))}
          </div>
          <input className={inputCls} value={form.emergencyShortCode} onChange={(e) => set('emergencyShortCode', e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="999" />
        </Field>
        <Field label="Emergency Hotline" error={errors.emergencyHotline}>
          <input className={inputCls} value={form.emergencyHotline} onChange={(e) => set('emergencyHotline', e.target.value)} placeholder="+252 ..." />
        </Field>
        <Field label="Status" className="md:col-span-2">
          <div className="flex flex-wrap gap-3">
            {CREATE_OPERATIONAL_STATUSES.map((s) => (
              <label key={s} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-bold ${form.operationalStatus === s ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-600'}`}>
                <input type="radio" checked={form.operationalStatus === s} onChange={() => set('operationalStatus', s)} />
                {s}
              </label>
            ))}
          </div>
        </Field>
      </SectionCard>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Branches & Locations</h2>
              <p className="text-xs text-gray-500">Used when dispatchers select destination hospital and branch</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => set('branches', [...form.branches, emptyBranch()])}>
            <Plus className="w-4 h-4 mr-1" /> Add branch
          </Button>
        </div>
        {errors.branches && <p className="px-6 pt-4 text-xs text-red-600">{errors.branches}</p>}
        <div className="p-6 space-y-6">
          {form.branches.map((branch, index) => {
            const branchDistricts = districts.filter((d) => d.regionId === branch.regionId)
            const prefix = `branch_${index}_`
            return (
              <div key={branch.id} className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-800">Branch {index + 1}</p>
                  {form.branches.length > 1 && (
                    <button type="button" className="text-red-600 p-1" onClick={() => set('branches', form.branches.filter((_, i) => i !== index))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Branch Name" required error={errors[`${prefix}name`]}>
                    <input className={inputCls} value={branch.name} onChange={(e) => updateBranch(index, { name: e.target.value })} placeholder="e.g. Hodan Branch" />
                  </Field>
                  <Field label="Branch Email" required error={errors[`${prefix}email`]}>
                    <input type="email" className={inputCls} value={branch.email} onChange={(e) => updateBranch(index, { email: e.target.value })} />
                  </Field>
                  <Field label="Region" required error={errors[`${prefix}regionId`]}>
                    <select className={inputCls} value={branch.regionId} onChange={(e) => updateBranch(index, { regionId: e.target.value, districtId: '' })}>
                      <option value="">Select region</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="District" required error={errors[`${prefix}districtId`]}>
                    <select className={inputCls} value={branch.districtId} onChange={(e) => updateBranch(index, { districtId: e.target.value })} disabled={!branch.regionId}>
                      <option value="">Select district</option>
                      {branchDistricts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Address" required error={errors[`${prefix}address`]} className="md:col-span-2">
                    <input className={inputCls} value={branch.address} onChange={(e) => updateBranch(index, { address: e.target.value })} />
                  </Field>
                  <Field label="Phone" required error={errors[`${prefix}primaryPhone`]}>
                    <input className={inputCls} value={branch.primaryPhone} onChange={(e) => updateBranch(index, { primaryPhone: e.target.value })} />
                  </Field>
                  <Field label="Hotline / Short Code" error={errors[`${prefix}emergencyShortCode`] || errors[`${prefix}emergencyHotline`]}>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} value={branch.emergencyShortCode} onChange={(e) => updateBranch(index, { emergencyShortCode: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder="999" />
                      <input className={inputCls} value={branch.emergencyHotline} onChange={(e) => updateBranch(index, { emergencyHotline: e.target.value })} placeholder="Full hotline" />
                    </div>
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold h-11 px-8">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Hospital
        </Button>
      </div>
    </form>
  )
}
