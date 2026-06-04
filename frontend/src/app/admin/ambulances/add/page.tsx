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
  Gauge,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ambulancesService,
  employeesService,
  systemSetupService,
  uploadService,
} from '@/lib/api'
import {
  AmbulanceStatus,
  District,
  Employee,
  EmployeeRole,
  Region,
  Station,
} from '@/types'

const STEPS = [
  { id: 'identity', label: 'Registration', icon: Hash },
  { id: 'vehicle', label: 'Vehicle', icon: Truck },
  { id: 'station', label: 'Station & Crew', icon: MapPin },
  { id: 'equipment', label: 'Equipment', icon: Shield },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const

type StepId = (typeof STEPS)[number]['id']

const VEHICLE_TYPES = [
  'Advanced Life Support (ALS)',
  'Basic Life Support (BLS)',
  'Critical Care Transport',
  'Patient Transport',
  'Intermediate Life Support',
] as const

const STATUS_OPTIONS: { value: AmbulanceStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_DUTY', label: 'On Duty' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
]

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 transition-all'

const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block'

const initialForm = {
  ambulanceNumber: '',
  plateNumber: '',
  fleetNumber: '',
  vehicleType: 'Advanced Life Support (ALS)',
  vehicleBrand: '',
  vehicleModel: '',
  vehicleYear: new Date().getFullYear(),
  status: 'AVAILABLE' as AmbulanceStatus,
  readinessScore: 100,
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

export default function AddAmbulancePage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [registrationFileName, setRegistrationFileName] = useState('')
  const [form, setForm] = useState(initialForm)

  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [nurses, setNurses] = useState<Employee[]>([])

  const currentStep = STEPS[stepIndex]

  const loadMasterData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [regionsData, districtsData, stationsData, roles] = await Promise.all([
        systemSetupService.getRegions(),
        systemSetupService.getDistricts(),
        systemSetupService.getStations(),
        systemSetupService.getRoles(),
      ])

      setRegions(regionsData)
      setDistricts(districtsData)
      setStations(stationsData)

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

  const filteredDistricts = useMemo(
    () => districts.filter((d) => d.regionId === form.regionId),
    [districts, form.regionId],
  )

  const filteredStations = useMemo(
    () =>
      stations.filter(
        (s) =>
          (!form.regionId || s.regionId === form.regionId) &&
          (!form.districtId || s.districtId === form.districtId),
      ),
    [stations, form.regionId, form.districtId],
  )

  const stationName = stations.find((s) => s.id === form.stationId)?.name
  const driverName = drivers.find((d) => d.id === form.assignedDriverId)
  const nurseName = nurses.find((n) => n.id === form.assignedNurseId)

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleRegistrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Upload a PDF or image of the vehicle registration book')
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

  const validateStep = (step: StepId): string | null => {
    switch (step) {
      case 'identity':
        if (!form.ambulanceNumber.trim()) return 'Ambulance ID is required'
        if (!form.plateNumber.trim()) return 'Plate number is required'
        if (!form.fleetNumber.trim()) return 'Fleet number is required'
        return null
      case 'vehicle':
        if (!form.vehicleType) return 'Select an ambulance type'
        if (!form.vehicleBrand.trim()) return 'Brand is required'
        if (!form.vehicleModel.trim()) return 'Model is required'
        if (!form.vehicleYear || form.vehicleYear < 1990) return 'Enter a valid year'
        return null
      case 'station':
        if (!form.stationId) return 'Select a base station'
        return null
      default:
        return null
    }
  }

  const goNext = () => {
    const err = validateStep(currentStep.id)
    if (err) {
      toast.error(err)
      return
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const handleSubmit = async () => {
    for (const step of STEPS.slice(0, -1)) {
      const err = validateStep(step.id)
      if (err) {
        toast.error(err)
        setStepIndex(STEPS.findIndex((s) => s.id === step.id))
        return
      }
    }

    try {
      setIsSubmitting(true)
      const station = stations.find((s) => s.id === form.stationId)

      const payload = {
        ambulanceNumber: form.ambulanceNumber.trim(),
        plateNumber: form.plateNumber.trim(),
        fleetNumber: form.fleetNumber.trim(),
        status: form.status,
        regionId: station?.regionId || form.regionId || undefined,
        districtId: station?.districtId || form.districtId || undefined,
        stationId: form.stationId,
        vehicleBrand: form.vehicleBrand.trim(),
        vehicleModel: form.vehicleModel.trim(),
        vehicleType: form.vehicleType,
        vehicleYear: Number(form.vehicleYear),
        readinessScore: Number(form.readinessScore),
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
              Fleet Management
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
                  <label className={labelClass}>1. Ambulance ID *</label>
                  <input
                    className={inputClass}
                    placeholder="AMB-001"
                    value={form.ambulanceNumber}
                    onChange={(e) => setField('ambulanceNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>2. Plate Number *</label>
                  <input
                    className={inputClass}
                    placeholder="SO-12345"
                    value={form.plateNumber}
                    onChange={(e) => setField('plateNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>3. Fleet Number *</label>
                  <input
                    className={inputClass}
                    placeholder="FLT-2026-01"
                    value={form.fleetNumber}
                    onChange={(e) => setField('fleetNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>19. Registration Expiry</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      className={`${inputClass} pl-10`}
                      value={form.registrationExpiry}
                      onChange={(e) => setField('registrationExpiry', e.target.value)}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Registration book (upload)</label>
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
                  <label className={labelClass}>4. Ambulance Type *</label>
                  <div className="grid sm:grid-cols-2 gap-3 mt-1">
                    {VEHICLE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setField('vehicleType', type)}
                        className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.vehicleType === type
                            ? 'border-red-500 bg-red-50 text-red-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>5. Brand *</label>
                    <input
                      className={inputClass}
                      placeholder="Toyota"
                      value={form.vehicleBrand}
                      onChange={(e) => setField('vehicleBrand', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>6. Model *</label>
                    <input
                      className={inputClass}
                      placeholder="Hiace"
                      value={form.vehicleModel}
                      onChange={(e) => setField('vehicleModel', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>7. Year *</label>
                    <input
                      type="number"
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      className={inputClass}
                      value={form.vehicleYear}
                      onChange={(e) => setField('vehicleYear', Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>8. Status</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {STATUS_OPTIONS.map((opt) => (
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
                <div>
                  <label className={labelClass}>9. Readiness Score — {form.readinessScore}%</label>
                  <div className="flex items-center gap-4 mt-1">
                    <Gauge className="w-5 h-5 text-red-500 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={form.readinessScore}
                      onChange={(e) => setField('readinessScore', Number(e.target.value))}
                      className="flex-1 h-2 accent-red-600 cursor-pointer"
                    />
                    <span
                      className={`text-sm font-black w-10 text-right ${
                        form.readinessScore >= 80
                          ? 'text-emerald-600'
                          : form.readinessScore >= 50
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {form.readinessScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === 'station' && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>10. Base Station *</label>
                  <select
                    className={inputClass}
                    value={form.stationId}
                    onChange={(e) => {
                      const station = stations.find((s) => s.id === e.target.value)
                      setForm((prev) => ({
                        ...prev,
                        stationId: e.target.value,
                        regionId: station?.regionId || prev.regionId,
                        districtId: station?.districtId || prev.districtId,
                      }))
                    }}
                  >
                    <option value="">Select base station</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>11. Primary Driver</label>
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
                  <label className={labelClass}>12. Assigned Nurse</label>
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
                    <span className="text-sm font-semibold text-slate-800">17. Oxygen Available</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-red-200 has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="checkbox"
                      checked={form.defibrillatorAvailable}
                      onChange={(e) => setField('defibrillatorAvailable', e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <HeartPulse className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-semibold text-slate-800">
                      18. Defibrillator Available
                    </span>
                  </label>
                </div>
                <div>
                  <label className={labelClass}>20. Notes</label>
                  <textarea
                    className={`${inputClass} min-h-[120px] resize-y`}
                    placeholder="Equipment checklist, special capabilities, dispatch notes…"
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep.id === 'review' && (
              <div className="space-y-4">
                {[
                  { label: 'Ambulance ID', value: form.ambulanceNumber },
                  { label: 'Plate Number', value: form.plateNumber },
                  { label: 'Fleet Number', value: form.fleetNumber },
                  { label: 'Ambulance Type', value: form.vehicleType },
                  {
                    label: 'Brand / Model / Year',
                    value: `${form.vehicleBrand} ${form.vehicleModel} (${form.vehicleYear})`,
                  },
                  { label: 'Status', value: form.status.replace('_', ' ') },
                  { label: 'Readiness Score', value: `${form.readinessScore}%` },
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
            <p className={labelClass}>Live preview</p>
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
                {form.fleetNumber && (
                  <p className="text-xs text-red-200 mt-1">Fleet {form.fleetNumber}</p>
                )}
              </div>
              <div className="p-5 space-y-3 bg-slate-50/50 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-slate-700">{form.vehicleType}</span>
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
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {form.readinessScore}% ready
                  </span>
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
