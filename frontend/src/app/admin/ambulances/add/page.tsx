'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Truck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Hash,
  MapPin,
  User,
  RefreshCw,
  Shield,
  Warehouse,
  Stethoscope,
  Wind,
  HeartPulse,
  FileText,
  Upload,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ambulancesService,
  employeesService,
  mdmService,
  systemSetupService,
  uploadService,
} from '@/lib/api'
import {
  AmbulanceStatus,
  Employee,
  EmployeeRole,
  Station,
} from '@/types'
import { ADMIN_AMBULANCE_STATUS_OPTIONS } from '@/lib/ambulance/status'
import {
  AmbulanceFormErrors,
  validateAmbulanceForm,
  validateAmbulanceFormStep,
  type AmbulanceFormStep,
} from '@/lib/ambulanceFormValidation'

const STEPS = [
  { id: 'identity', label: 'Registration', icon: Hash },
  { id: 'vehicle', label: 'Vehicle', icon: Truck },
  { id: 'station', label: 'Station & Crew', icon: MapPin },
  { id: 'equipment', label: 'Equipment', icon: Shield },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const

type AmbulanceTypeOption = {
  id: string
  name: string
  code: string
  description?: string | null
}

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 transition-all'

const labelClass = 'text-sm font-semibold text-slate-700 mb-1.5 block'

const initialForm = {
  ambulanceNumber: '',
  plateNumber: '',
  vehicleType: '',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: new Date().getFullYear(),
  status: 'AVAILABLE' as AmbulanceStatus,
  regionId: '',
  districtId: '',
  stationId: '',
  assignedDriverId: '',
  assignedNurseId: '',
  oxygenAvailable: false,
  defibrillatorAvailable: false,
  registrationExpiry: '',
  registrationDocumentUrl: '',
  notes: '',
}

function fieldInputClass(error?: string) {
  return error ? `${inputClass} border-red-300 focus:ring-red-500/20 focus:border-red-400` : inputClass
}

export default function AddAmbulancePage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [registrationFileName, setRegistrationFileName] = useState('')
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState<AmbulanceFormErrors>({})

  const [stations, setStations] = useState<Station[]>([])
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [nurses, setNurses] = useState<Employee[]>([])
  const [ambulanceTypes, setAmbulanceTypes] = useState<AmbulanceTypeOption[]>([])

  const currentStep = STEPS[stepIndex]

  const ambulanceTypeNames = useMemo(
    () => ambulanceTypes.map((t) => t.name),
    [ambulanceTypes],
  )

  const loadMasterData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [stationsData, roles, typesData] = await Promise.all([
        systemSetupService.getStations(),
        systemSetupService.getRoles(),
        mdmService.listAll('ambulance-types', { status: 'active' }).catch(() => []),
      ])

      setStations(stationsData)

      const types = (Array.isArray(typesData) ? typesData : []) as AmbulanceTypeOption[]
      setAmbulanceTypes(types)
      if (types.length > 0) {
        setForm((prev) => ({
          ...prev,
          vehicleType: prev.vehicleType || types[0].name,
        }))
      }

      const driverRole = roles.find((r: EmployeeRole) =>
        r.name.toUpperCase().includes('DRIVER'),
      )
      const nurseRole = roles.find((r: EmployeeRole) =>
        r.name.toUpperCase().includes('NURSE'),
      )

      if (driverRole) {
        const driverList = await employeesService.getAll(driverRole.id)
        setDrivers(driverList.filter((d) => !d.assignedAmbulanceId))
      }
      if (nurseRole) {
        const nurseList = await employeesService.getAll(nurseRole.id)
        setNurses(nurseList.filter((n) => !n.assignedAmbulanceId))
      }
    } catch {
      toast.error('Failed to load form data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  const stationName = stations.find((s) => s.id === form.stationId)?.name
  const driverName = drivers.find((d) => d.id === form.assignedDriverId)
  const nurseName = nurses.find((n) => n.id === form.assignedNurseId)

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleRegistrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Upload a PDF or image of the vehicle registration book')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5 MB')
      return
    }
    try {
      setIsUploading(true)
      const result = await uploadService.uploadFile(file)
      setField('registrationDocumentUrl', result.url)
      setRegistrationFileName(file.name)
      toast.success('Registration document uploaded')
    } catch {
      toast.error('Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const runStepValidation = (step: AmbulanceFormStep) => {
    const result = validateAmbulanceFormStep(step, form, ambulanceTypeNames)
    setFieldErrors((prev) => {
      const next = { ...prev }
      const stepFields: (keyof AmbulanceFormErrors)[] =
        step === 'identity'
          ? ['ambulanceNumber', 'plateNumber', 'registrationExpiry']
          : step === 'vehicle'
            ? ['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear']
            : step === 'station'
              ? ['stationId']
              : ['notes']
      stepFields.forEach((f) => delete next[f])
      return { ...next, ...result.errors }
    })
    return result
  }

  const goNext = () => {
    const result = runStepValidation(currentStep.id as AmbulanceFormStep)
    if (!result.valid) {
      toast.error(result.firstMessage || 'Please fix the highlighted fields')
      return
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const handleSubmit = async () => {
    const result = validateAmbulanceForm(form, ambulanceTypeNames)
    setFieldErrors(result.errors)
    if (!result.valid) {
      toast.error(result.firstMessage || 'Please fix validation errors')
      if (result.firstStep) {
        setStepIndex(STEPS.findIndex((s) => s.id === result.firstStep))
      }
      return
    }

    try {
      setIsSubmitting(true)
      const station = stations.find((s) => s.id === form.stationId)

      const payload = {
        ambulanceNumber: form.ambulanceNumber.trim(),
        plateNumber: form.plateNumber.trim(),
        status: form.status,
        regionId: station?.regionId || form.regionId || undefined,
        districtId: station?.districtId || form.districtId || undefined,
        stationId: form.stationId,
        vehicleBrand: form.vehicleBrand.trim(),
        vehicleModel: form.vehicleModel.trim(),
        vehicleType: form.vehicleType,
        vehicleYear: Number(form.vehicleYear),
        oxygenAvailable: form.oxygenAvailable,
        defibrillatorAvailable: form.defibrillatorAvailable,
        registrationExpiry: form.registrationExpiry
          ? new Date(form.registrationExpiry).toISOString()
          : undefined,
        registrationDocumentUrl: form.registrationDocumentUrl || undefined,
        notes: form.notes.trim() || undefined,
        isActive: true,
      }

      const created = await ambulancesService.create(payload)

      if (form.assignedDriverId) {
        await ambulancesService.assignDriver(created.id, form.assignedDriverId)
      }
      if (form.assignedNurseId) {
        await ambulancesService.assignNurse(created.id, form.assignedNurseId)
      }

      toast.success(`Ambulance ${created.ambulanceNumber} registered successfully`)
      router.push('/admin/ambulances')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to register ambulance'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading registration form…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Truck className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <Link href="/admin/ambulances">
            <Button
              variant="outline"
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 h-10 w-10 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Ambulance Management
            </p>
            <h1 className="text-3xl font-black tracking-tight">Register Ambulance</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Complete vehicle identity, crew assignment, equipment, and registration details.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === stepIndex
            const isDone = idx < stepIndex
            return (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => idx < stepIndex && setStepIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-200'
                      : isDone
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <currentStep.icon className="w-5 h-5 text-red-600" />
              {currentStep.label}
            </h2>

            {currentStep.id === 'identity' && (
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Ambulance ID *</label>
                  <input
                    className={fieldInputClass(fieldErrors.ambulanceNumber)}
                    placeholder="AMB-001"
                    value={form.ambulanceNumber}
                    onChange={(e) => setField('ambulanceNumber', e.target.value.toUpperCase())}
                  />
                  {fieldErrors.ambulanceNumber ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.ambulanceNumber}</p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass}>Plate Number *</label>
                  <input
                    className={fieldInputClass(fieldErrors.plateNumber)}
                    placeholder="SO-12345"
                    value={form.plateNumber}
                    onChange={(e) => setField('plateNumber', e.target.value.toUpperCase())}
                  />
                  {fieldErrors.plateNumber ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.plateNumber}</p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass}>Registration Expiry</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      className={`${fieldInputClass(fieldErrors.registrationExpiry)} pl-10`}
                      value={form.registrationExpiry}
                      onChange={(e) => setField('registrationExpiry', e.target.value)}
                    />
                  </div>
                  {fieldErrors.registrationExpiry ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.registrationExpiry}</p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Registration Book</label>
                  <label className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-red-300 transition-colors">
                    <Upload className="w-5 h-5 text-red-500 shrink-0" />
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-semibold text-slate-700">
                        {registrationFileName || 'Upload vehicle registration book (PDF or image)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Max 5 MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleRegistrationUpload}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                    )}
                    {form.registrationDocumentUrl && !isUploading && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                  </label>
                </div>
              </div>
            )}

            {currentStep.id === 'vehicle' && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Ambulance Type *</label>
                  <select
                    className={fieldInputClass(fieldErrors.vehicleType)}
                    value={form.vehicleType}
                    onChange={(e) => setField('vehicleType', e.target.value)}
                    disabled={ambulanceTypes.length === 0}
                  >
                    {ambulanceTypes.length === 0 ? (
                      <option value="">No types configured — add them in Master Data</option>
                    ) : (
                      ambulanceTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                          {type.code ? ` (${type.code})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {fieldErrors.vehicleType ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.vehicleType}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">
                      Types are managed in{' '}
                      <Link href="/admin/master-data/ambulance" className="text-red-600 font-semibold hover:underline">
                        Master Data → Ambulance
                      </Link>
                    </p>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>Brand *</label>
                    <input
                      className={fieldInputClass(fieldErrors.vehicleBrand)}
                      placeholder="Toyota"
                      value={form.vehicleBrand}
                      onChange={(e) => setField('vehicleBrand', e.target.value)}
                    />
                    {fieldErrors.vehicleBrand ? (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.vehicleBrand}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass}>Model *</label>
                    <input
                      className={fieldInputClass(fieldErrors.vehicleModel)}
                      placeholder="Hiace"
                      value={form.vehicleModel}
                      onChange={(e) => setField('vehicleModel', e.target.value)}
                    />
                    {fieldErrors.vehicleModel ? (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.vehicleModel}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass}>Year *</label>
                    <input
                      type="number"
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      className={fieldInputClass(fieldErrors.vehicleYear)}
                      value={form.vehicleYear}
                      onChange={(e) => setField('vehicleYear', Number(e.target.value))}
                    />
                    {fieldErrors.vehicleYear ? (
                      <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.vehicleYear}</p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ADMIN_AMBULANCE_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField('status', opt.value)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                          form.status === opt.value
                            ? 'border-red-500 bg-red-50 text-red-800'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === 'station' && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Base Station *</label>
                  <select
                    className={fieldInputClass(fieldErrors.stationId)}
                    value={form.stationId}
                    onChange={(e) => {
                      const station = stations.find((s) => s.id === e.target.value)
                      setForm((prev) => ({
                        ...prev,
                        stationId: e.target.value,
                        regionId: station?.regionId || prev.regionId,
                        districtId: station?.districtId || prev.districtId,
                      }))
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.stationId
                        return next
                      })
                    }}
                  >
                    <option value="">Select base station</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.stationId ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.stationId}</p>
                  ) : null}
                </div>
                <div>
                  <label className={labelClass}>Primary Driver</label>
                  <select
                    className={inputClass}
                    value={form.assignedDriverId}
                    onChange={(e) => setField('assignedDriverId', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName}
                        {d.user?.username ? ` (${d.user.username})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Assigned Nurse</label>
                  <select
                    className={inputClass}
                    value={form.assignedNurseId}
                    onChange={(e) => setField('assignedNurseId', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.firstName} {n.lastName}
                        {n.user?.username ? ` (${n.user.username})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {currentStep.id === 'equipment' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-red-200 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="checkbox"
                      checked={form.oxygenAvailable}
                      onChange={(e) => setField('oxygenAvailable', e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <Wind className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-800">Oxygen Available</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-red-200 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="checkbox"
                      checked={form.defibrillatorAvailable}
                      onChange={(e) => setField('defibrillatorAvailable', e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <HeartPulse className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-semibold text-slate-800">Defibrillator Available</span>
                  </label>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    className={`${fieldInputClass(fieldErrors.notes)} min-h-[120px] resize-y`}
                    placeholder="Equipment checklist, special capabilities, dispatch notes…"
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                  />
                  {fieldErrors.notes ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.notes}</p>
                  ) : null}
                </div>
              </div>
            )}

            {currentStep.id === 'review' && (
              <div className="space-y-4">
                {[
                  { label: 'Ambulance ID', value: form.ambulanceNumber },
                  { label: 'Plate Number', value: form.plateNumber },
                  { label: 'Ambulance Type', value: form.vehicleType },
                  {
                    label: 'Brand / Model / Year',
                    value: `${form.vehicleBrand} ${form.vehicleModel} (${form.vehicleYear})`,
                  },
                  { label: 'Status', value: form.status.replace('_', ' ') },
                  { label: 'Base Station', value: stationName || '—' },
                  {
                    label: 'Primary Driver',
                    value: driverName
                      ? `${driverName.firstName} ${driverName.lastName}`
                      : 'Unassigned',
                  },
                  {
                    label: 'Assigned Nurse',
                    value: nurseName
                      ? `${nurseName.firstName} ${nurseName.lastName}`
                      : 'Unassigned',
                  },
                  {
                    label: 'Oxygen / Defibrillator',
                    value: `${form.oxygenAvailable ? 'O₂ Yes' : 'O₂ No'} · ${form.defibrillatorAvailable ? 'AED Yes' : 'AED No'}`,
                  },
                  {
                    label: 'Registration Expiry',
                    value: form.registrationExpiry || 'Not set',
                  },
                  {
                    label: 'Registration Document',
                    value: registrationFileName || (form.registrationDocumentUrl ? 'Uploaded' : 'Not uploaded'),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 py-3 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-800 text-right">{row.value}</span>
                  </div>
                ))}
                {form.notes && (
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <p className={labelClass}>Notes</p>
                    <p className="text-sm text-slate-700">{form.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 mt-8 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {currentStep.id !== 'review' ? (
                <Button type="button" onClick={goNext} className="rounded-xl bg-red-600 hover:bg-red-700">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-xl bg-red-600 hover:bg-red-700 min-w-[160px]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Register ambulance
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-6 space-y-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live preview</p>
            <div className="rounded-2xl overflow-hidden border border-slate-100">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
                <div className="flex items-center justify-between gap-2">
                  <Truck className="w-8 h-8 opacity-90" />
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {form.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-2xl font-black mt-3">{form.ambulanceNumber || 'AMB-—'}</p>
                <p className="text-sm text-red-100 mt-1 font-mono">{form.plateNumber || 'PLATE —'}</p>
              </div>
              <div className="p-5 space-y-3 bg-slate-50/50 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-slate-700">{form.vehicleType || 'Ambulance type'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {[form.vehicleBrand, form.vehicleModel, form.vehicleYear].filter(Boolean).join(' · ') ||
                    'Vehicle details'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Warehouse className="w-4 h-4 text-slate-400" />
                  {stationName || 'Base station'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  {driverName ? `${driverName.firstName} ${driverName.lastName}` : 'No driver'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Stethoscope className="w-4 h-4 text-slate-400" />
                  {nurseName ? `${nurseName.firstName} ${nurseName.lastName}` : 'No nurse'}
                </div>
                <div className="flex gap-2 pt-1">
                  {form.oxygenAvailable && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                      O₂
                    </span>
                  )}
                  {form.defibrillatorAvailable && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100">
                      AED
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Step {stepIndex + 1} of {STEPS.length} — {currentStep.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
