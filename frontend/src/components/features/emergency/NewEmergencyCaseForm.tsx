'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  User,
  UserPlus,
  Users,
  MapPin,
  AlertOctagon,
  Truck,
  Building2,
  Stethoscope,
  Wind,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flag,
  CheckCircle,
  RefreshCw,
  Timer,
  Search,
  ChevronRight,
  ChevronLeft,
  Shield,
  ExternalLink,
  Warehouse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import { useAuth } from '@/context/AuthContext'
import {
  emergencyRequestsService,
  patientsService,
  systemSetupService,
  hospitalsService,
} from '@/lib/api'
import {
  Priority,
  RequestSource,
  Patient,
  IncidentCategory,
  Region,
  District,
  Station,
  Ambulance,
  Employee,
} from '@/types'
import {
  EmergencyCaseFormErrors,
  validateEmergencyCaseForm,
  validateEmergencyCaseStep,
  phoneDigits,
  MAX_PATIENT_AGE,
} from '@/lib/emergencyCaseFormValidation'

const STEPS = [
  { id: 'patient', label: 'Patient', icon: User },
  { id: 'emergency', label: 'Emergency', icon: AlertOctagon },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
] as const

type StepId = (typeof STEPS)[number]['id']

const STEP_FIELDS: Record<StepId, readonly string[]> = {
  patient: [
    'patientId',
    'callerName',
    'callerPhone',
    'newPatient.fullName',
    'newPatient.phone',
    'newPatient.alternatePhone',
    'newPatient.age',
    'newPatient.dateOfBirth',
  ],
  emergency: ['incidentCategoryId', 'patientCondition', 'symptoms', 'priority'],
  location: ['regionId', 'districtId', 'pickupAreaZone', 'pickupLocation', 'pickupLandmark', 'destination', 'destinationHospitalId'],
  dispatch: ['notes', 'manualDispatchNotes'],
}

const REQUEST_SOURCES: { value: RequestSource; label: string }[] = [
  { value: RequestSource.PHONE_CALL, label: 'Phone Call' },
  { value: RequestSource.WALK_IN, label: 'Walk-in' },
  { value: RequestSource.STAFF, label: 'Staff' },
  { value: RequestSource.REFERRAL, label: 'Referral' },
  { value: RequestSource.OTHER, label: 'Other' },
]

const PRIORITIES = [
  { id: Priority.CRITICAL, label: 'Critical', icon: AlertTriangle },
  { id: Priority.HIGH, label: 'High', icon: Flag },
  { id: Priority.MEDIUM, label: 'Medium', icon: Clock },
  { id: Priority.LOW, label: 'Low', icon: CheckCircle },
]

function SectionCard({
  title,
  icon: Icon,
  iconBg,
  children,
  badge,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldLabel({
  children,
  required,
  error,
}: {
  children: React.ReactNode
  required?: boolean
  error?: string
}) {
  return (
    <div className="mb-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {children}
        {required && <span className="text-red-500">*</span>}
      </label>
      {error && <p className="text-[10px] font-bold text-red-500 mt-0.5 normal-case tracking-normal">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-800 outline-none transition focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 placeholder:text-slate-400'

function fieldInputClass(error?: string) {
  return error ? `${inputClass} border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-100` : inputClass
}

export default function NewEmergencyCaseForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<StepId>('patient')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successCode, setSuccessCode] = useState<string | null>(null)
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null)
  const [isNewPatient, setIsNewPatient] = useState(true)
  const [patientSearch, setPatientSearch] = useState('')
  const [elapsed, setElapsed] = useState('00:00:00')
  const [sessionStart] = useState(() => Date.now())

  const [patients, setPatients] = useState<Patient[]>([])
  const [categories, setCategories] = useState<IncidentCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingStations, setLoadingStations] = useState(false)
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [regionsError, setRegionsError] = useState<string | null>(null)
  const [allAmbulances, setAllAmbulances] = useState<Ambulance[]>([])
  const [allDrivers, setAllDrivers] = useState<Employee[]>([])
  const [allNurses, setAllNurses] = useState<Employee[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [fieldErrors, setFieldErrors] = useState<EmergencyCaseFormErrors>({})

  const [form, setForm] = useState({
    patientId: '',
    priority: Priority.HIGH,
    incidentCategoryId: '',
    requestSource: RequestSource.PHONE_CALL,
    regionId: '',
    districtId: '',
    pickupAreaZone: '',
    nearestStationId: '',
    pickupLocation: '',
    pickupLandmark: '',
    destination: '',
    destinationHospitalId: '',
    callerName: '',
    callerPhone: '',
    symptoms: '',
    patientCondition: '',
    consciousStatus: 'CONSCIOUS',
    breathingStatus: 'NORMAL',
    bleedingStatus: 'NONE',
    needsOxygen: false,
    needsStretcher: false,
    notes: '',
    manualDispatchNotes: '',
    ambulanceId: '',
    driverId: '',
    nurseId: '',
    newPatient: {
      fullName: '',
      age: '',
      dateOfBirth: '',
      gender: '' as '' | 'MALE' | 'FEMALE',
      bloodType: '',
      phone: '',
      alternatePhone: '',
      nationalityType: 'LOCAL' as const,
      country: 'Somalia',
      maritalStatus: 'UNKNOWN' as const,
    },
  })

  const patch = (updates: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...updates }))
    setFieldErrors((errs) => {
      const next = { ...errs }
      for (const key of Object.keys(updates)) {
        delete next[key]
      }
      return next
    })
  }
  const patchPatient = (updates: Partial<typeof form.newPatient>) => {
    setForm((f) => ({ ...f, newPatient: { ...f.newPatient, ...updates } }))
    setFieldErrors((errs) => {
      const next = { ...errs }
      for (const key of Object.keys(updates)) {
        delete next[`newPatient.${key}`]
      }
      return next
    })
  }

  const validationOptions = useMemo(
    () => ({ isNewPatient, districtCount: districts.length }),
    [isNewPatient, districts.length]
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      const diff = Date.now() - sessionStart
      const h = Math.floor(diff / 3600000)
        .toString()
        .padStart(2, '0')
      const m = Math.floor((diff % 3600000) / 60000)
        .toString()
        .padStart(2, '0')
      const s = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(t)
  }, [sessionStart])

  const loadIncidentCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setCategoriesError(null)
    try {
      const data = await systemSetupService.getIncidentCategories()
      const list = Array.isArray(data) ? data.filter((c: IncidentCategory) => c.isActive !== false) : []
      setCategories(list)
      if (list.length === 0) {
        setCategoriesError('No incident categories found. Add categories in System Setup.')
      }
      return list
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load incident categories'
      setCategoriesError(Array.isArray(msg) ? msg.join(', ') : msg)
      setCategories([])
      return []
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const loadHospitals = useCallback(async () => {
    setLoadingHospitals(true)
    try {
      const data = await hospitalsService.getAll()
      const list = Array.isArray(data) ? data.filter((h: any) => h.isActive !== false) : []
      list.sort((a: any, b: any) => {
        const aAvailable = a.status === 'Available' ? 0 : 1
        const bAvailable = b.status === 'Available' ? 0 : 1
        if (aAvailable !== bAvailable) return aAvailable - bAvailable
        return String(a.name).localeCompare(String(b.name))
      })
      setHospitals(list)
    } catch {
      setHospitals([])
      toast.error('Failed to load hospitals from registry')
    } finally {
      setLoadingHospitals(false)
    }
  }, [])

  const loadResources = useCallback(async () => {
    try {
      const [patientsRes, regionsRes, ambulancesRes, driversRes, nursesRes] = await Promise.all([
        patientsService.getAll().catch(() => []),
        systemSetupService.getRegions(),
        emergencyRequestsService.getAvailableAmbulances().catch(() => []),
        emergencyRequestsService.getAvailableDrivers().catch(() => []),
        emergencyRequestsService.getAvailableNurses().catch(() => []),
      ])
      setPatients(Array.isArray(patientsRes) ? patientsRes : [])
      const regionsList = Array.isArray(regionsRes) ? regionsRes : []
      setRegions(regionsList)
      if (!regionsList.length) {
        setRegionsError('No regions in System Setup. Add regions first.')
      } else {
        setRegionsError(null)
      }
      setAllAmbulances(Array.isArray(ambulancesRes) ? ambulancesRes : [])
      setAllDrivers(Array.isArray(driversRes) ? driversRes : [])
      setAllNurses(Array.isArray(nursesRes) ? nursesRes : [])
      await Promise.all([loadIncidentCategories(), loadHospitals()])
    } catch {
      setRegionsError('Failed to load regions from System Setup')
      toast.error('Failed to load dispatch resources')
    } finally {
      setLoading(false)
    }
  }, [loadIncidentCategories, loadHospitals])

  useEffect(() => {
    if (form.incidentCategoryId && categories.length > 0) {
      const exists = categories.some((c) => c.id === form.incidentCategoryId)
      if (!exists) patch({ incidentCategoryId: '' })
    }
  }, [categories, form.incidentCategoryId])

  useEffect(() => {
    loadResources()
  }, [loadResources])

  useEffect(() => {
    if (step === 'emergency') {
      loadIncidentCategories()
    }
    if (step === 'location') {
      if (!regions.length) {
        systemSetupService
          .getRegions()
          .then((r) => setRegions(Array.isArray(r) ? r : []))
          .catch(() => setRegionsError('Failed to load regions'))
      }
      if (!hospitals.length && !loadingHospitals) {
        loadHospitals()
      }
    }
  }, [step, loadIncidentCategories, loadHospitals, form.districtId, form.regionId, regions.length, hospitals.length, loadingHospitals])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.incidentCategoryId),
    [categories, form.incidentCategoryId]
  )

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === form.regionId),
    [regions, form.regionId]
  )
  const selectedDistrict = useMemo(
    () => districts.find((d) => d.id === form.districtId),
    [districts, form.districtId]
  )
  const selectedStation = useMemo(
    () => stations.find((s) => s.id === form.nearestStationId),
    [stations, form.nearestStationId]
  )

  const filteredAmbulances = useMemo(() => {
    let list = allAmbulances
    if (form.nearestStationId) {
      const atStation = list.filter((a) => a.stationId === form.nearestStationId)
      if (atStation.length) list = atStation
    } else if (form.districtId) {
      const inDistrict = list.filter((a) => a.districtId === form.districtId)
      if (inDistrict.length) list = inDistrict
    } else if (form.regionId) {
      const inRegion = list.filter((a) => a.regionId === form.regionId)
      if (inRegion.length) list = inRegion
    }
    return list
  }, [allAmbulances, form.nearestStationId, form.districtId, form.regionId])

  const filteredDrivers = useMemo(() => {
    if (!form.nearestStationId) return allDrivers
    const atStation = allDrivers.filter((d) => d.stationId === form.nearestStationId)
    return atStation.length ? atStation : allDrivers
  }, [allDrivers, form.nearestStationId])

  const filteredNurses = useMemo(() => {
    if (!form.nearestStationId) return allNurses
    const atStation = allNurses.filter((n) => n.stationId === form.nearestStationId)
    return atStation.length ? atStation : allNurses
  }, [allNurses, form.nearestStationId])

  const handleRegionChange = async (regionId: string) => {
    patch({
      regionId,
      districtId: '',
      pickupAreaZone: '',
      nearestStationId: '',
      ambulanceId: '',
      driverId: '',
      nurseId: '',
    })
    setDistricts([])
    setStations([])
    if (!regionId) return

    setLoadingDistricts(true)
    try {
      const d = await systemSetupService.getDistricts(regionId)
      setDistricts(Array.isArray(d) ? d : [])
      if (!Array.isArray(d) || d.length === 0) {
        toast.error('No districts in this region. Add them in System Setup.')
      }
    } catch {
      toast.error('Failed to load districts')
      setDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }

  const handleDistrictChange = async (districtId: string) => {
    patch({
      districtId,
      pickupAreaZone: '',
      nearestStationId: '',
      ambulanceId: '',
      driverId: '',
      nurseId: '',
    })
    setStations([])
    if (!districtId) return

    setLoadingStations(true)
    try {
      const stationList = await systemSetupService.getStations(districtId)
      setStations(Array.isArray(stationList) ? stationList : [])
    } catch {
      toast.error('Failed to load stations')
      setStations([])
    } finally {
      setLoadingStations(false)
    }
  }

  const handleStationChange = (nearestStationId: string) => {
    patch({ nearestStationId, ambulanceId: '', driverId: '', nurseId: '' })
  }

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.patientCode?.toLowerCase().includes(q)
    )
  }, [patients, patientSearch])

  const selectedPatient = patients.find((p) => p.id === form.patientId)

  useEffect(() => {
    if (!isNewPatient && selectedPatient) {
      patch({
        callerName: selectedPatient.fullName,
        callerPhone: selectedPatient.phone,
      })
    }
  }, [isNewPatient, selectedPatient?.id])

  const handleDriverChange = (driverId: string) => {
    const driver = filteredDrivers.find((d) => d.id === driverId) || allDrivers.find((d) => d.id === driverId)
    patch({
      driverId,
      ambulanceId: driver?.assignedAmbulanceId || form.ambulanceId,
    })
  }

  const buildPayload = () => {
    const pickupBase = form.pickupLocation.trim()
    const areaZone = form.pickupAreaZone.trim()
    const pickupLocation =
      pickupBase && areaZone && !pickupBase.includes(areaZone)
        ? `${pickupBase}, ${areaZone}`
        : pickupBase || areaZone

    const payload: Record<string, unknown> = {
      priority: form.priority,
      requestSource: form.requestSource,
      pickupLocation,
      consciousStatus: form.consciousStatus,
      breathingStatus: form.breathingStatus,
      bleedingStatus: form.bleedingStatus,
      needsOxygen: form.needsOxygen,
      needsStretcher: form.needsStretcher,
    }

    const optional: (keyof typeof form)[] = [
      'incidentCategoryId',
      'regionId',
      'districtId',
      'pickupLandmark',
      'destination',
      'destinationHospitalId',
      'callerName',
      'callerPhone',
      'symptoms',
      'patientCondition',
      'notes',
      'manualDispatchNotes',
      'ambulanceId',
      'driverId',
      'nurseId',
    ]
    optional.forEach((key) => {
      const val = form[key]
      if (val !== '' && val != null) payload[key] = val
    })

    if (isNewPatient) {
      payload.newPatient = {
        ...form.newPatient,
        age: form.newPatient.age ? parseInt(form.newPatient.age, 10) : undefined,
        gender: form.newPatient.gender || undefined,
        bloodType: form.newPatient.bloodType || undefined,
      }
      if (!form.callerName && form.newPatient.fullName) {
        payload.callerName = form.newPatient.fullName
      }
      if (!form.callerPhone && form.newPatient.phone) {
        payload.callerPhone = form.newPatient.phone
      }
    } else {
      payload.patientId = form.patientId
    }

    return payload
  }

  const validateStep = (s: StepId): boolean => {
    const result = validateEmergencyCaseStep(s, form, validationOptions)
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const field of STEP_FIELDS[s]) {
        delete next[field]
      }
      return { ...next, ...result.errors }
    })
    if (!result.valid && result.firstMessage) {
      toast.error(result.firstMessage)
    }
    return result.valid
  }

  const goNext = () => {
    const idx = STEPS.findIndex((s) => s.id === step)
    if (!validateStep(step)) return
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id)
  }

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.id === step)
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  const handleSubmit = async () => {
    const result = validateEmergencyCaseForm(form, validationOptions)
    setFieldErrors(result.errors)
    if (!result.valid) {
      if (result.firstMessage) toast.error(result.firstMessage)
      if (result.firstStep) setStep(result.firstStep)
      return
    }

    setSubmitting(true)
    try {
      const result = await emergencyRequestsService.create(buildPayload())
      const code = result?.trackingCode || result?.id
      setSuccessCode(code)
      setCreatedCaseId(result?.id || null)
      toast.success(`Case ${code} created successfully`)
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create case'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (successCode) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0F172A] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-10 text-center text-white">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Case Dispatched</h1>
            <p className="text-red-100 text-sm mt-2">Emergency request registered in Aamin EADS</p>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tracking Code</p>
              <p className="text-3xl font-black text-red-600 font-mono tracking-wide">{successCode}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={createdCaseId ? `/admin/emergency-requests/track/${createdCaseId}` : '/admin/emergency-requests/pending'}
                className="flex-1 h-12 flex items-center justify-center rounded-xl bg-[#0F172A] text-white text-sm font-bold uppercase tracking-wide hover:bg-slate-800"
              >
                View Case
              </Link>
              <Link
                href="/admin/emergency-requests/pending"
                className="flex-1 h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-wide hover:bg-slate-50"
              >
                Pending Queue
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="fixed inset-0 z-[100] bg-[#EEF1F5] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-[#B71C1C] via-[#C62828] to-[#D32F2F] text-white shadow-lg">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/emergency-requests')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-wide">New Emergency Case</h1>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
              </div>
              <p className="text-[11px] text-red-100 font-medium uppercase tracking-widest mt-0.5">
                Aamin Emergency Dispatch · {user?.username || 'Admin'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase opacity-70">Session</p>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full font-mono text-lg font-black">
                <Timer className="w-4 h-4" />
                {elapsed}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold uppercase opacity-70">Fleet Ready</p>
              <p className="text-lg font-black">{allAmbulances.length} units</p>
            </div>
          </div>
        </div>

        {/* Step progress */}
        <div className="px-6 pb-4">
          <div className="flex gap-1 max-w-3xl">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = s.id === step
              const done = i < stepIndex
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (i <= stepIndex || validateStep(step)) setStep(s.id)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                    active
                      ? 'bg-white text-red-700 shadow-md'
                      : done
                        ? 'bg-white/25 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading dispatch resources…</p>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 'patient' && (
                <SectionCard title="Patient & Caller" icon={User} iconBg="bg-blue-100 text-blue-600">
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewPatient(true)
                        setFieldErrors({})
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition ${
                        isNewPatient ? 'bg-[#0F172A] text-white shadow' : 'text-slate-500'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" /> New Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewPatient(false)
                        setFieldErrors({})
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition ${
                        !isNewPatient ? 'bg-[#0F172A] text-white shadow' : 'text-slate-500'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Existing
                    </button>
                  </div>

                  {isNewPatient ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p className="md:col-span-2 text-xs text-slate-500 font-medium">
                        Provide patient age or date of birth. Phone numbers use Somalia format (+252 6/7XXXXXXXX).
                      </p>
                      <div className="md:col-span-2">
                        <FieldLabel required error={fieldErrors['newPatient.fullName']}>
                          Full Name
                        </FieldLabel>
                        <input
                          className={fieldInputClass(fieldErrors['newPatient.fullName'])}
                          value={form.newPatient.fullName}
                          maxLength={100}
                          onChange={(e) => patchPatient({ fullName: e.target.value })}
                          placeholder="Patient legal name"
                        />
                      </div>
                      <div>
                        <FieldLabel>Gender</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {(['MALE', 'FEMALE'] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => patchPatient({ gender: g })}
                              className={`h-11 rounded-xl border text-sm font-bold transition ${
                                form.newPatient.gender === g
                                  ? g === 'MALE'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-pink-50 border-pink-500 text-pink-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              {g === 'MALE' ? 'Male' : 'Female'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Blood Group</FieldLabel>
                        <select
                          className={inputClass}
                          value={form.newPatient.bloodType}
                          onChange={(e) => patchPatient({ bloodType: e.target.value })}
                        >
                          <option value="">Unknown</option>
                          {[
                            ['O_POSITIVE', 'O+'],
                            ['O_NEGATIVE', 'O-'],
                            ['A_POSITIVE', 'A+'],
                            ['A_NEGATIVE', 'A-'],
                            ['B_POSITIVE', 'B+'],
                            ['B_NEGATIVE', 'B-'],
                            ['AB_POSITIVE', 'AB+'],
                            ['AB_NEGATIVE', 'AB-'],
                          ].map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel required error={fieldErrors['newPatient.phone']}>
                          Phone (+252)
                        </FieldLabel>
                        <div
                          className={`flex h-11 rounded-xl border overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-400 ${
                            fieldErrors['newPatient.phone'] ? 'border-red-400' : 'border-slate-200'
                          }`}
                        >
                          <span className="px-3 flex items-center text-xs font-bold text-slate-600 bg-slate-200 border-r border-slate-200">
                            +252
                          </span>
                          <input
                            className="flex-1 px-3 bg-transparent outline-none text-sm font-medium"
                            value={form.newPatient.phone}
                            inputMode="numeric"
                            maxLength={9}
                            onChange={(e) => patchPatient({ phone: phoneDigits(e.target.value) })}
                            placeholder="61XXXXXXX"
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel error={fieldErrors['newPatient.alternatePhone']}>Alternate Phone</FieldLabel>
                        <div
                          className={`flex h-11 rounded-xl border overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-400 ${
                            fieldErrors['newPatient.alternatePhone'] ? 'border-red-400' : 'border-slate-200'
                          }`}
                        >
                          <span className="px-3 flex items-center text-xs font-bold text-slate-600 bg-slate-200 border-r border-slate-200">
                            +252
                          </span>
                          <input
                            className="flex-1 px-3 bg-transparent outline-none text-sm font-medium"
                            value={form.newPatient.alternatePhone}
                            inputMode="numeric"
                            maxLength={9}
                            onChange={(e) => patchPatient({ alternatePhone: phoneDigits(e.target.value) })}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel required error={fieldErrors['newPatient.age']}>
                          Age (years)
                        </FieldLabel>
                        <input
                          type="number"
                          min={0}
                          max={MAX_PATIENT_AGE}
                          className={fieldInputClass(fieldErrors['newPatient.age'])}
                          value={form.newPatient.age}
                          onChange={(e) => patchPatient({ age: e.target.value })}
                          placeholder={`0–${MAX_PATIENT_AGE}`}
                        />
                      </div>
                      <div>
                        <FieldLabel error={fieldErrors['newPatient.dateOfBirth']}>Date of Birth</FieldLabel>
                        <input
                          type="date"
                          className={fieldInputClass(fieldErrors['newPatient.dateOfBirth'])}
                          value={form.newPatient.dateOfBirth}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => patchPatient({ dateOfBirth: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FieldLabel required error={fieldErrors.patientId}>
                        Search Patient Registry
                      </FieldLabel>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          className={`${fieldInputClass(fieldErrors.patientId)} pl-10`}
                          placeholder="Name, phone, or patient code…"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className={fieldInputClass(fieldErrors.patientId)}
                        value={form.patientId}
                        onChange={(e) => patch({ patientId: e.target.value })}
                      >
                        <option value="">— Select patient —</option>
                        {filteredPatients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} · {p.phone} · {p.patientCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
                    <div>
                      <FieldLabel error={fieldErrors.callerName}>Caller Name</FieldLabel>
                      <input
                        className={fieldInputClass(fieldErrors.callerName)}
                        value={form.callerName}
                        maxLength={80}
                        onChange={(e) => patch({ callerName: e.target.value })}
                        placeholder="Who is calling?"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        required={form.requestSource === RequestSource.PHONE_CALL}
                        error={fieldErrors.callerPhone}
                      >
                        Caller Phone
                      </FieldLabel>
                      <input
                        className={fieldInputClass(fieldErrors.callerPhone)}
                        value={form.callerPhone}
                        inputMode="numeric"
                        maxLength={9}
                        onChange={(e) => patch({ callerPhone: phoneDigits(e.target.value) })}
                        placeholder="61XXXXXXX (uses patient phone if empty)"
                      />
                    </div>
                  </div>
                </SectionCard>
              )}

              {step === 'emergency' && (
                <>
                  <SectionCard
                    title="Emergency Details"
                    icon={AlertOctagon}
                    iconBg="bg-red-100 text-red-600"
                    badge={<PriorityBadge priority={form.priority} size="sm" />}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <FieldLabel required error={fieldErrors.incidentCategoryId}>
                            Incident Category
                          </FieldLabel>
                          <div className="flex items-center gap-2">
                            {categoriesLoading && (
                              <RefreshCw className="w-3.5 h-3.5 text-red-500 animate-spin" />
                            )}
                            <Link
                              href="/admin/system-setup?tab=categories"
                              className="text-[10px] font-bold uppercase text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              System Setup <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                        <select
                          className={fieldInputClass(fieldErrors.incidentCategoryId)}
                          value={form.incidentCategoryId}
                          disabled={categoriesLoading}
                          onChange={(e) => patch({ incidentCategoryId: e.target.value })}
                        >
                          <option value="">
                            {categoriesLoading
                              ? 'Loading categories…'
                              : categories.length
                                ? 'Select category from System Setup'
                                : 'No categories available'}
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.description ? ` — ${c.description}` : ''}
                            </option>
                          ))}
                        </select>
                        {categoriesError && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-bold text-amber-700">{categoriesError}</p>
                            <button
                              type="button"
                              onClick={() => loadIncidentCategories()}
                              className="text-[10px] font-bold uppercase text-red-600 hover:underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {!categoriesError && categories.length > 0 && (
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} loaded from System Setup
                          </p>
                        )}
                        {selectedCategory && (
                          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                            <p className="text-xs font-bold text-slate-800">{selectedCategory.name}</p>
                            {selectedCategory.description && (
                              <p className="text-[11px] text-slate-600 mt-1">{selectedCategory.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <FieldLabel>Request Source</FieldLabel>
                        <select
                          className={inputClass}
                          value={form.requestSource}
                          onChange={(e) => patch({ requestSource: e.target.value as RequestSource })}
                        >
                          {REQUEST_SOURCES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <FieldLabel error={fieldErrors.priority}>Priority Level</FieldLabel>
                    {fieldErrors.priority && (
                      <p className="text-[10px] font-bold text-red-500 mb-2 -mt-2">{fieldErrors.priority}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                      {PRIORITIES.map((p) => {
                        const Icon = p.icon
                        const selected = form.priority === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => patch({ priority: p.id })}
                            className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                              selected
                                ? 'border-red-500 bg-red-50 text-red-800 shadow-sm scale-[1.02]'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${selected ? 'text-red-600' : 'opacity-40'}`} />
                            <span className="text-[10px] font-black uppercase">{p.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <FieldLabel error={fieldErrors.patientCondition}>Condition Summary</FieldLabel>
                        <textarea
                          rows={2}
                          maxLength={500}
                          className={`${fieldInputClass(fieldErrors.patientCondition)} h-auto py-3 resize-none`}
                          value={form.patientCondition}
                          onChange={(e) => patch({ patientCondition: e.target.value })}
                          placeholder="Main condition, mechanism of injury…"
                        />
                        <p className="text-[10px] text-slate-400 text-right mt-1">{form.patientCondition.length}/500</p>
                      </div>
                      <div>
                        <FieldLabel error={fieldErrors.symptoms}>Symptoms</FieldLabel>
                        <textarea
                          rows={2}
                          maxLength={500}
                          className={`${fieldInputClass(fieldErrors.symptoms)} h-auto py-3 resize-none`}
                          value={form.symptoms}
                          onChange={(e) => patch({ symptoms: e.target.value })}
                          placeholder="Reported symptoms…"
                        />
                        <p className="text-[10px] text-slate-400 text-right mt-1">{form.symptoms.length}/500</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      {[
                        { key: 'consciousStatus', label: 'Conscious', options: ['CONSCIOUS', 'SEMI_CONSCIOUS', 'UNCONSCIOUS'] },
                        { key: 'breathingStatus', label: 'Breathing', options: ['NORMAL', 'DIFFICULT', 'LABORED', 'ARREST'] },
                        { key: 'bleedingStatus', label: 'Bleeding', options: ['NONE', 'MILD', 'MODERATE', 'SEVERE'] },
                      ].map(({ key, label, options }) => (
                        <div key={key}>
                          <FieldLabel>{label}</FieldLabel>
                          <select
                            className={inputClass}
                            value={form[key as keyof typeof form] as string}
                            onChange={(e) => patch({ [key]: e.target.value })}
                          >
                            {options.map((o) => (
                              <option key={o} value={o}>
                                {o.replace(/_/g, ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </>
              )}

              {step === 'location' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectionCard title="Pickup Location" icon={MapPin} iconBg="bg-emerald-100 text-emerald-600">
                    {regionsError && (
                      <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                        {regionsError}{' '}
                        <Link href="/admin/system-setup?tab=regions" className="text-red-600 underline ml-1">
                          System Setup
                        </Link>
                      </div>
                    )}

                    {(selectedRegion || selectedDistrict || form.pickupAreaZone.trim()) && (
                      <div className="mb-4 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-slate-700">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{selectedRegion?.name || '—'}</span>
                        <ChevronRight className="w-3 h-3 text-emerald-300" />
                        <span>{selectedDistrict?.name || 'Select district'}</span>
                        {form.pickupAreaZone.trim() && (
                          <>
                            <ChevronRight className="w-3 h-3 text-emerald-300" />
                            <span className="text-emerald-700">{form.pickupAreaZone.trim()}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel required error={fieldErrors.regionId}>Region</FieldLabel>
                          <Link
                            href="/admin/system-setup?tab=regions"
                            className="text-[10px] font-bold uppercase text-emerald-700 hover:underline flex items-center gap-1 mb-1.5"
                          >
                            Setup <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <select
                          className={fieldInputClass(fieldErrors.regionId)}
                          value={form.regionId}
                          onChange={(e) => handleRegionChange(e.target.value)}
                        >
                          <option value="">
                            {regions.length ? 'Select region' : 'No regions — add in System Setup'}
                          </option>
                          {regions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel required={!!form.regionId && districts.length > 0} error={fieldErrors.districtId}>
                          District {loadingDistricts && '…'}
                        </FieldLabel>
                        <select
                          className={fieldInputClass(fieldErrors.districtId)}
                          value={form.districtId}
                          disabled={!form.regionId || loadingDistricts}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                        >
                          <option value="">
                            {!form.regionId
                              ? 'Select region first'
                              : loadingDistricts
                                ? 'Loading districts…'
                                : districts.length
                                  ? 'Select district'
                                  : 'No districts in this region'}
                          </option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel error={fieldErrors.pickupAreaZone}>Area / Zone</FieldLabel>
                        <input
                          className={fieldInputClass(fieldErrors.pickupAreaZone)}
                          value={form.pickupAreaZone}
                          disabled={!form.districtId}
                          maxLength={100}
                          placeholder="e.g. Hodan, Wadajir, Zone 3"
                          onChange={(e) => patch({ pickupAreaZone: e.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Nearest Station {loadingStations && '…'}</FieldLabel>
                        <select
                          className={fieldInputClass(undefined)}
                          value={form.nearestStationId}
                          disabled={!form.districtId || loadingStations}
                          onChange={(e) => handleStationChange(e.target.value)}
                        >
                          <option value="">
                            {!form.districtId
                              ? 'Select district first'
                              : loadingStations
                                ? 'Loading stations…'
                                : stations.length
                                  ? 'Select station (optional)'
                                  : 'No stations in district'}
                          </option>
                          {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {s.address ? ` · ${s.address}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedStation && (
                      <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <p className="font-bold text-slate-800">{selectedStation.name}</p>
                        {selectedStation.address && (
                          <p className="text-slate-600 mt-1">{selectedStation.address}</p>
                        )}
                        {selectedStation.phone && <p className="text-slate-500 mt-1">Tel: {selectedStation.phone}</p>}
                        <p className="text-[10px] text-indigo-600 font-bold uppercase mt-2">
                          Dispatch resources filtered to this station
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <FieldLabel required error={fieldErrors.pickupLocation}>
                          Pickup Address / Street
                        </FieldLabel>
                        <input
                          className={fieldInputClass(fieldErrors.pickupLocation)}
                          value={form.pickupLocation}
                          minLength={2}
                          maxLength={20}
                          onChange={(e) => patch({ pickupLocation: e.target.value })}
                          placeholder="Street, building, or exact location for dispatch"
                        />
                      </div>
                      <div>
                        <FieldLabel error={fieldErrors.pickupLandmark}>Landmark</FieldLabel>
                        <input
                          className={fieldInputClass(fieldErrors.pickupLandmark)}
                          value={form.pickupLandmark}
                          maxLength={200}
                          onChange={(e) => patch({ pickupLandmark: e.target.value })}
                          placeholder="Near mosque, market, etc."
                        />
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Destination Hospital"
                    icon={Building2}
                    iconBg="bg-purple-100 text-purple-600"
                    badge={
                      loadingHospitals ? (
                        <RefreshCw className="w-4 h-4 text-purple-500 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold text-purple-700">
                          {hospitals.length} from registry
                        </span>
                      )
                    }
                  >
                    <p className="text-[10px] text-slate-500 font-medium mb-3">
                      All active hospitals from the registry
                      {hospitals.length === 0 && !loadingHospitals && ' — none found, try alternate destination below'}
                    </p>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {loadingHospitals && (
                        <p className="text-sm text-slate-500 text-center py-8">Loading hospitals…</p>
                      )}
                      {!loadingHospitals && hospitals.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-8">
                          No hospitals in the registry.{' '}
                          <Link href="/admin/system-setup?tab=hospitals" className="text-red-600 font-bold">
                            Add in System Setup
                          </Link>
                        </p>
                      )}
                      {!loadingHospitals &&
                        hospitals.map((h) => {
                          const selected = form.destinationHospitalId === h.id
                          const statusOk = h.status === 'Available'
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => patch({ destinationHospitalId: h.id, destination: h.name })}
                              className={`w-full text-left p-4 rounded-xl border-2 transition ${
                                selected
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold text-sm text-slate-800">{h.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {h.district?.name || h.region?.name || 'Somalia'} · {h.beds} beds
                                    {h.erReady && ' · ER Ready'}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    statusOk
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}
                                >
                                  {statusOk ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <AlertTriangle className="w-3 h-3" />
                                  )}
                                  {h.status}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                    </div>
                    <div className="mt-4">
                      <FieldLabel error={fieldErrors.destination}>Alternate Destination (text)</FieldLabel>
                      {(fieldErrors.destinationHospitalId || fieldErrors.destination) &&
                        (form.priority === Priority.CRITICAL || form.priority === Priority.HIGH) && (
                          <p className="text-[10px] font-bold text-amber-600 mb-2">
                            Urgent cases require a hospital or alternate destination
                          </p>
                        )}
                      <input
                        className={fieldInputClass(fieldErrors.destination || fieldErrors.destinationHospitalId)}
                        value={form.destination}
                        maxLength={200}
                        onChange={(e) => patch({ destination: e.target.value, destinationHospitalId: '' })}
                        placeholder="If not in hospital list"
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {step === 'dispatch' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectionCard
                    title="Resource Assignment"
                    icon={Truck}
                    iconBg="bg-indigo-100 text-indigo-600"
                    badge={
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        {filteredAmbulances.length} available
                        {form.nearestStationId && selectedStation ? ` · ${selectedStation.name}` : ''}
                      </span>
                    }
                  >
                    {(form.regionId || form.districtId) && (
                      <p className="text-[10px] text-slate-500 font-medium mb-3">
                        Fleet filtered by{' '}
                        {form.nearestStationId
                          ? `station ${selectedStation?.name}`
                          : form.districtId
                            ? `district ${selectedDistrict?.name}`
                            : `region ${selectedRegion?.name}`}
                      </p>
                    )}
                    <FieldLabel>Ambulance Unit</FieldLabel>
                    <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                      {filteredAmbulances.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">
                          No ambulances in this area — case will stay pending until assigned
                        </p>
                      ) : (
                        filteredAmbulances.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => patch({ ambulanceId: a.id })}
                            className={`min-w-[140px] p-3 rounded-xl border-2 text-left transition shrink-0 ${
                              form.ambulanceId === a.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <Truck
                              className={`w-6 h-6 mb-2 ${form.ambulanceId === a.id ? 'text-indigo-600' : 'text-slate-400'}`}
                            />
                            <p className="font-black text-sm">{a.ambulanceNumber}</p>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">{a.vehicleType || a.status}</p>
                            <p className="text-[10px] font-bold text-slate-600 mt-2">
                              Fuel: {a.fuelLevel ?? '—'}%
                            </p>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Driver</FieldLabel>
                        <select className={inputClass} value={form.driverId} onChange={(e) => handleDriverChange(e.target.value)}>
                          <option value="">Optional</option>
                          {filteredDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.firstName} {d.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Nurse / Medic</FieldLabel>
                        <select
                          className={inputClass}
                          value={form.nurseId}
                          onChange={(e) => patch({ nurseId: e.target.value })}
                        >
                          <option value="">Optional</option>
                          {filteredNurses.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.firstName} {n.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Support & Notes" icon={Stethoscope} iconBg="bg-teal-100 text-teal-600">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        {
                          key: 'needsOxygen' as const,
                          label: 'Oxygen',
                          icon: Wind,
                          checked: form.needsOxygen,
                        },
                        {
                          key: 'needsStretcher' as const,
                          label: 'Stretcher',
                          icon: HeartPulse,
                          checked: form.needsStretcher,
                        },
                      ].map(({ key, label, icon: Icon, checked }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => patch({ [key]: !checked })}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                            checked ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                              checked ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
                            }`}
                          >
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <Icon className="w-4 h-4 text-slate-600" />
                          <span className="text-xs font-bold uppercase">{label}</span>
                        </button>
                      ))}
                    </div>
                    <FieldLabel error={fieldErrors.manualDispatchNotes}>Dispatch Notes</FieldLabel>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      className={`${fieldInputClass(fieldErrors.manualDispatchNotes)} h-auto py-3 resize-none`}
                      value={form.manualDispatchNotes}
                      onChange={(e) => patch({ manualDispatchNotes: e.target.value })}
                      placeholder="Instructions for driver, scene hazards, access notes…"
                    />
                    <p className="text-[10px] text-slate-400 text-right mt-1">{form.manualDispatchNotes.length}/1000</p>
                    <FieldLabel error={fieldErrors.notes}>Internal Notes</FieldLabel>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      className={`${fieldInputClass(fieldErrors.notes)} h-auto py-3 resize-none mt-1.5`}
                      value={form.notes}
                      onChange={(e) => patch({ notes: e.target.value })}
                      placeholder="Additional case notes"
                    />
                    <p className="text-[10px] text-slate-400 text-right mt-1">{form.notes.length}/1000</p>

                    <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-700 uppercase tracking-wide">
                        <Shield className="w-4 h-4" /> Dispatch Summary
                      </div>
                      <p>
                        <span className="text-slate-500">Priority:</span>{' '}
                        <PriorityBadge priority={form.priority} size="sm" />
                      </p>
                      <p>
                        <span className="text-slate-500">Status after submit:</span>{' '}
                        <span className="font-bold text-slate-800">
                          {form.ambulanceId || form.driverId ? 'ASSIGNED' : 'PENDING'}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        Pickup: {form.pickupLocation || '—'}
                      </p>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {!loading && (
        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {form.priority}
              </span>
              <span>
                {form.ambulanceId ? 'Unit selected' : 'Awaiting unit'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="h-11 px-5 font-bold uppercase text-xs tracking-wide"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {step !== 'dispatch' ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="h-11 px-6 bg-[#0F172A] hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wide"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="h-11 px-8 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-black uppercase text-xs tracking-wide shadow-lg disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Dispatching…
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" /> Dispatch Case
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
