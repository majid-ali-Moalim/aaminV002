'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, User, ClipboardList, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import {
  emergencyRequestsService,
  patientsService,
  systemSetupService,
} from '@/lib/api'
import {
  BloodType,
  EmergencyRequest,
  Gender,
  MaritalStatus,
  NationalityType,
  Priority,
  District,
  Region,
} from '@/types'
import { AGE_GROUPS } from '@/components/public/hire-ambulance/constants'
import { normalizePhoneDigits } from '@/lib/driverFormValidation'
import { calcPatientAge } from '@/lib/patients/patientDisplay'
import {
  ageGroupFromAge,
  firstUpdateCaseError,
  resolveFormAge,
  type UpdateCaseFormErrors,
  type UpdateCaseFormValues,
  validateUpdateCaseForm,
} from '@/lib/patients/updatePatientCaseValidation'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'

const inputClass =
  'w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100'

const textareaClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-y min-h-[72px]'

function fieldClass(error?: string) {
  return error ? `${inputClass} border-red-400 bg-red-50/40` : inputClass
}

function toFormValues(req: EmergencyRequest): UpdateCaseFormValues {
  const p = req.patient
  const age = p ? calcPatientAge(p) : null
  const dob = p?.dateOfBirth ? p.dateOfBirth.slice(0, 10) : ''

  return {
    fullName: p?.fullName || req.callerName || '',
    phone: p?.phone || req.callerPhone || '',
    alternatePhone: (p as { alternatePhone?: string })?.alternatePhone || '',
    email: p?.email || '',
    gender: (p?.gender as Gender) || '',
    bloodType: (p?.bloodType as BloodType) || '',
    nationalityType: p?.nationalityType || NationalityType.LOCAL,
    country: p?.country || 'Somalia',
    ageGroup: ageGroupFromAge(age),
    age: age != null ? String(age) : '',
    dateOfBirth: dob,
    address: p?.address || req.pickupLocation || '',
    regionId: p?.regionId || '',
    districtId: p?.districtId || '',
    maritalStatus: p?.maritalStatus || MaritalStatus.UNKNOWN,
    conditions: p?.conditions || '',
    allergies: p?.allergies || '',
    insuranceProvider: p?.insuranceProvider || '',
    priority: req.priority,
    callerName: req.callerName || p?.fullName || '',
    callerPhone: req.callerPhone || p?.phone || '',
    pickupLocation: req.pickupLocation || '',
    pickupLandmark: req.pickupLandmark || '',
    destination: req.destination || '',
    patientCondition: req.patientCondition || '',
    symptoms: req.symptoms || '',
    consciousStatus: req.consciousStatus || '',
    breathingStatus: req.breathingStatus || '',
    bleedingStatus: req.bleedingStatus || '',
    needsOxygen: req.needsOxygen ?? false,
    needsStretcher: req.needsStretcher ?? false,
    notes: req.notes || '',
    caseRegionId: req.regionId || '',
    caseDistrictId: req.districtId || '',
  }
}

type Props = {
  request: EmergencyRequest
  onClose: () => void
  onSuccess: (updated: EmergencyRequest) => void
}

export default function UpdatePatientCaseModal({ request, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'patient' | 'case'>('patient')
  const [form, setForm] = useState<UpdateCaseFormValues>(() => toFormValues(request))
  const [errors, setErrors] = useState<UpdateCaseFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])
  const [patientDistricts, setPatientDistricts] = useState<District[]>([])
  const [caseDistricts, setCaseDistricts] = useState<District[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  useEffect(() => {
    systemSetupService.getRegions().then((rows) => {
      setRegions(Array.isArray(rows) ? rows : [])
    })
  }, [])

  const loadDistricts = useCallback(async (regionId: string, target: 'patient' | 'case') => {
    if (!regionId) {
      if (target === 'patient') setPatientDistricts([])
      else setCaseDistricts([])
      return
    }
    setLoadingDistricts(true)
    try {
      const rows = await systemSetupService.getDistricts(regionId)
      const list = Array.isArray(rows) ? rows : []
      if (target === 'patient') setPatientDistricts(list)
      else setCaseDistricts(list)
    } catch {
      if (target === 'patient') setPatientDistricts([])
      else setCaseDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  useEffect(() => {
    if (form.regionId) void loadDistricts(form.regionId, 'patient')
  }, [form.regionId, loadDistricts])

  useEffect(() => {
    if (form.caseRegionId) void loadDistricts(form.caseRegionId, 'case')
  }, [form.caseRegionId, loadDistricts])

  const patch = (patchValues: Partial<UpdateCaseFormValues>) => {
    setForm((prev) => ({ ...prev, ...patchValues }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(patchValues).forEach((k) => delete next[k as keyof UpdateCaseFormValues])
      return next
    })
  }

  const handleSubmit = async () => {
    const validationErrors = validateUpdateCaseForm(form)
    setErrors(validationErrors)
    const msg = firstUpdateCaseError(validationErrors)
    if (msg) {
      toast.error(msg)
      if (validationErrors.pickupLocation || validationErrors.priority) setTab('case')
      else setTab('patient')
      return
    }

    setSubmitting(true)
    try {
      const resolvedAge = resolveFormAge(form)
      const patientPayload = {
        fullName: form.fullName.trim(),
        phone: normalizePhoneDigits(form.phone),
        alternatePhone: form.alternatePhone.trim()
          ? normalizePhoneDigits(form.alternatePhone)
          : undefined,
        email: form.email.trim() || undefined,
        gender: form.gender || undefined,
        bloodType: form.bloodType || undefined,
        nationalityType: form.nationalityType,
        country: form.country.trim() || undefined,
        age: resolvedAge ?? undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        address: form.address.trim() || request.pickupLocation || 'Not provided',
        regionId: form.regionId || undefined,
        districtId: form.districtId || undefined,
        maritalStatus: form.maritalStatus || MaritalStatus.UNKNOWN,
        conditions: form.conditions.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        insuranceProvider: form.insuranceProvider.trim() || undefined,
      }

      if (request.patientId) {
        await patientsService.update(request.patientId, patientPayload)
      }

      const casePayload = {
        priority: form.priority,
        callerName: form.callerName.trim() || form.fullName.trim(),
        callerPhone: form.callerPhone.trim()
          ? normalizePhoneDigits(form.callerPhone)
          : normalizePhoneDigits(form.phone),
        pickupLocation: form.pickupLocation.trim(),
        pickupLandmark: form.pickupLandmark.trim() || undefined,
        destination: form.destination.trim() || undefined,
        patientCondition: form.patientCondition.trim() || undefined,
        symptoms: form.symptoms.trim() || undefined,
        consciousStatus: form.consciousStatus.trim() || undefined,
        breathingStatus: form.breathingStatus.trim() || undefined,
        bleedingStatus: form.bleedingStatus.trim() || undefined,
        needsOxygen: form.needsOxygen,
        needsStretcher: form.needsStretcher,
        notes: form.notes.trim() || undefined,
        regionId: form.caseRegionId || undefined,
        districtId: form.caseDistrictId || undefined,
      }

      const updated = await emergencyRequestsService.update(request.id, casePayload)
      toast.success(`Case ${request.trackingCode} updated`)
      onSuccess(updated as EmergencyRequest)
      onClose()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const msg = err?.response?.data?.message || err?.message || 'Failed to update case'
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm flex justify-center items-start z-[130] p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-red-700 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Update Case</p>
            <h3 className="text-lg font-black tracking-tight">{request.trackingCode}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('patient')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition ${
              tab === 'patient'
                ? 'bg-white text-red-700 border border-b-0 border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            Patient Details
          </button>
          <button
            type="button"
            onClick={() => setTab('case')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition ${
              tab === 'case'
                ? 'bg-white text-red-700 border border-b-0 border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Case Details
          </button>
        </div>

        <div className="p-6 max-h-[min(70vh,640px)] overflow-y-auto space-y-4">
          {tab === 'patient' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Full Name *</label>
                  <input
                    className={fieldClass(errors.fullName)}
                    value={form.fullName}
                    onChange={(e) => patch({ fullName: e.target.value })}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone *</label>
                  <input
                    className={fieldClass(errors.phone)}
                    value={form.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                  />
                  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Alternate Phone</label>
                  <input
                    className={fieldClass(errors.alternatePhone)}
                    value={form.alternatePhone}
                    onChange={(e) => patch({ alternatePhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Email</label>
                  <input
                    className={fieldClass(errors.email)}
                    type="email"
                    value={form.email}
                    onChange={(e) => patch({ email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Gender</label>
                  <select
                    className={fieldClass(errors.gender)}
                    value={form.gender}
                    onChange={(e) => patch({ gender: e.target.value as '' | Gender })}
                  >
                    <option value="">Not specified</option>
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Blood Group</label>
                  <select
                    className={fieldClass(errors.bloodType)}
                    value={form.bloodType}
                    onChange={(e) => patch({ bloodType: e.target.value as '' | BloodType })}
                  >
                    <option value="">Not specified</option>
                    {Object.values(BloodType).map((bt) => (
                      <option key={bt} value={bt}>
                        {bt.replace('_POSITIVE', '+').replace('_NEGATIVE', '−').replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nationality</label>
                  <select
                    className={fieldClass()}
                    value={form.nationalityType}
                    onChange={(e) =>
                      patch({ nationalityType: e.target.value as NationalityType })
                    }
                  >
                    <option value={NationalityType.LOCAL}>Local</option>
                    <option value={NationalityType.INTERNATIONAL}>International</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Country</label>
                  <input
                    className={fieldClass(errors.country)}
                    value={form.country}
                    onChange={(e) => patch({ country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Age Group</label>
                  <select
                    className={fieldClass()}
                    value={form.ageGroup}
                    onChange={(e) =>
                      patch({ ageGroup: e.target.value, age: '', dateOfBirth: '' })
                    }
                  >
                    <option value="">Select age group</option>
                    {AGE_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Exact Age</label>
                  <input
                    className={fieldClass(errors.age)}
                    type="number"
                    min={0}
                    max={120}
                    value={form.age}
                    onChange={(e) => patch({ age: e.target.value, ageGroup: '' })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Date of Birth</label>
                  <input
                    className={fieldClass()}
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      patch({ dateOfBirth: e.target.value, ageGroup: '', age: '' })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Marital Status</label>
                  <select
                    className={fieldClass()}
                    value={form.maritalStatus}
                    onChange={(e) => patch({ maritalStatus: e.target.value })}
                  >
                    {Object.values(MaritalStatus).map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Address</label>
                  <input
                    className={fieldClass(errors.address)}
                    value={form.address}
                    onChange={(e) => patch({ address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Region</label>
                  <select
                    className={fieldClass()}
                    value={form.regionId}
                    onChange={(e) => patch({ regionId: e.target.value, districtId: '' })}
                  >
                    <option value="">Select region</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">District</label>
                  <select
                    className={fieldClass()}
                    value={form.districtId}
                    onChange={(e) => patch({ districtId: e.target.value })}
                    disabled={!form.regionId || loadingDistricts}
                  >
                    <option value="">
                      {loadingDistricts ? 'Loading…' : 'Select district'}
                    </option>
                    {patientDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Medical Conditions
                  </label>
                  <textarea
                    className={textareaClass}
                    value={form.conditions}
                    onChange={(e) => patch({ conditions: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Allergies</label>
                  <textarea
                    className={textareaClass}
                    value={form.allergies}
                    onChange={(e) => patch({ allergies: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Insurance Provider
                  </label>
                  <input
                    className={fieldClass()}
                    value={form.insuranceProvider}
                    onChange={(e) => patch({ insuranceProvider: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'case' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Priority</span>
                <PriorityBadge priority={form.priority} size="sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => patch({ priority: p })}
                    className={`py-2 rounded-xl border-2 text-[10px] font-black uppercase ${
                      form.priority === p
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Caller Name</label>
                  <input
                    className={fieldClass()}
                    value={form.callerName}
                    onChange={(e) => patch({ callerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Caller Phone</label>
                  <input
                    className={fieldClass(errors.callerPhone)}
                    value={form.callerPhone}
                    onChange={(e) => patch({ callerPhone: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Pickup Location *
                  </label>
                  <input
                    className={fieldClass(errors.pickupLocation)}
                    value={form.pickupLocation}
                    onChange={(e) => patch({ pickupLocation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Landmark</label>
                  <input
                    className={fieldClass()}
                    value={form.pickupLandmark}
                    onChange={(e) => patch({ pickupLandmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Destination</label>
                  <input
                    className={fieldClass()}
                    value={form.destination}
                    onChange={(e) => patch({ destination: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Case Region</label>
                  <select
                    className={fieldClass()}
                    value={form.caseRegionId}
                    onChange={(e) => patch({ caseRegionId: e.target.value, caseDistrictId: '' })}
                  >
                    <option value="">Select region</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Case District</label>
                  <select
                    className={fieldClass()}
                    value={form.caseDistrictId}
                    onChange={(e) => patch({ caseDistrictId: e.target.value })}
                    disabled={!form.caseRegionId || loadingDistricts}
                  >
                    <option value="">
                      {loadingDistricts ? 'Loading…' : 'Select district'}
                    </option>
                    {caseDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Patient Condition
                  </label>
                  <textarea
                    className={textareaClass}
                    value={form.patientCondition}
                    onChange={(e) => patch({ patientCondition: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Symptoms</label>
                  <textarea
                    className={textareaClass}
                    value={form.symptoms}
                    onChange={(e) => patch({ symptoms: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Conscious Status</label>
                  <input
                    className={fieldClass()}
                    value={form.consciousStatus}
                    onChange={(e) => patch({ consciousStatus: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Breathing Status</label>
                  <input
                    className={fieldClass()}
                    value={form.breathingStatus}
                    onChange={(e) => patch({ breathingStatus: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Bleeding Status</label>
                  <input
                    className={fieldClass()}
                    value={form.bleedingStatus}
                    onChange={(e) => patch({ bleedingStatus: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.needsOxygen}
                      onChange={(e) => patch({ needsOxygen: e.target.checked })}
                    />
                    Needs oxygen
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.needsStretcher}
                      onChange={(e) => patch({ needsStretcher: e.target.checked })}
                    />
                    Needs stretcher
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Notes</label>
                  <textarea
                    className={textareaClass}
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Save Updates'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
