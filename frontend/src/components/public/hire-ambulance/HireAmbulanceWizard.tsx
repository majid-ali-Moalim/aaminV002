'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Phone,
  MapPin,
  Navigation,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Truck,
  Shield,
  Wind,
  StretchHorizontal,
  AlertTriangle,
  Radio,
  Sparkles,
  Clock,
  Users,
  Share2,
  RefreshCw,
} from 'lucide-react'
import {
  API_BASE,
  STEPS,
  StepId,
  REQUEST_TYPES,
  DRAFT_KEY,
  EMERGENCY_HOTLINE,
} from './constants'
import {
  HireFormValues,
  HireEmergencyTypeOption,
  defaultFormValues,
  validateStep,
  buildPayload,
  computePriority,
  formatSomaliaPhone,
  hasGpsLocation,
  hasManualLocation,
  hasPickupLocation,
  isEmergencyRequest,
  isOtherEmergencyType,
  calculateAgeFromDateOfBirth,
  syncEstimatedAgeFromDob,
} from './formHelpers'
import { fetchHireEmergencyTypes } from '@/lib/hire-ambulance/emergencyTypes'
import { COUNTRY_NAMES } from '@/lib/countries'
import { googleMapsUrl } from '@/lib/pickupGps'

const inputClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
const selectClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelClass}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function HireAmbulanceWizard() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [regions, setRegions] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [fleet, setFleet] = useState<{ available: number; total: number }>({ available: 0, total: 0 })
  const [fleetStatus, setFleetStatus] = useState<'loading' | 'available' | 'unavailable'>('loading')
  const [emergencyTypes, setEmergencyTypes] = useState<HireEmergencyTypeOption[]>([])
  const [loadingEmergencyTypes, setLoadingEmergencyTypes] = useState(true)
  const [locating, setLocating] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, getValues } = useForm<HireFormValues>({
    defaultValues: defaultFormValues,
  })

  const values = watch()
  const currentStep = STEPS[stepIndex].id
  const priority = useMemo(() => computePriority(values), [values])
  const isEmergency = isEmergencyRequest(values)
  const gpsShared = hasGpsLocation(values)
  const manualAddress = hasManualLocation(values)
  const hasLocation = hasPickupLocation(values)

  const selectedEmergencyType = useMemo(
    () => emergencyTypes.find((t) => t.id === values.emergencyType),
    [emergencyTypes, values.emergencyType],
  )

  const showEmergencyTypeOther = isOtherEmergencyType(selectedEmergencyType)

  const emergencyTypeDisplayLabel = useMemo(() => {
    if (!selectedEmergencyType) return '—'
    if (isOtherEmergencyType(selectedEmergencyType)) {
      return values.emergencyTypeOther.trim() || selectedEmergencyType.name
    }
    return selectedEmergencyType.name
  }, [selectedEmergencyType, values.emergencyTypeOther])

  // Restore draft
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.form) reset({ ...defaultFormValues, ...draft.form })
      if (typeof draft.stepIndex === 'number') setStepIndex(Math.min(draft.stepIndex, STEPS.length - 1))
    } catch {
      /* ignore */
    }
  }, [reset])

  // Save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form: getValues(), stepIndex }),
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [values, stepIndex, getValues])

  const loadPublicData = useCallback(async () => {
    setFleetStatus('loading')
    try {
      const [regionsRes, hospitalsRes, fleetRes, types] = await Promise.all([
        fetch(`${API_BASE}/api/setup/regions`),
        fetch(`${API_BASE}/api/hospitals`),
        fetch(`${API_BASE}/api/emergency-requests/available/ambulances`),
        fetchHireEmergencyTypes(),
      ])
      if (regionsRes.ok) setRegions(await regionsRes.json())
      if (hospitalsRes.ok) setHospitals(await hospitalsRes.json())
      setEmergencyTypes(types)
      if (fleetRes.ok) {
        const ambulances = await fleetRes.json()
        const list = Array.isArray(ambulances) ? ambulances : []
        const available = list.filter((a: any) => a.status === 'AVAILABLE').length
        setFleet({
          total: list.length,
          available,
        })
        setFleetStatus(available > 0 ? 'available' : 'unavailable')
      } else {
        setFleetStatus('available')
      }
    } catch {
      setFleetStatus('available')
    } finally {
      setLoadingEmergencyTypes(false)
    }
  }, [])

  useEffect(() => {
    void loadPublicData()
    const interval = setInterval(loadPublicData, 30000)
    return () => clearInterval(interval)
  }, [loadPublicData])

  useEffect(() => {
    if (!values.regionId) {
      setDistricts([])
      return
    }
    fetch(`${API_BASE}/api/setup/districts?regionId=${values.regionId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDistricts)
      .catch(() => setDistricts([]))
  }, [values.regionId])

  useEffect(() => {
    setValue('estimatedAge', syncEstimatedAgeFromDob(values.dateOfBirth))
  }, [values.dateOfBirth, setValue])

  useEffect(() => {
    if (values.isPatient === 'YES' && values.callerName.trim() && !values.patientName.trim()) {
      setValue('patientName', values.callerName.trim())
    }
  }, [values.isPatient, values.callerName, values.patientName, setValue])

  const estimatedAgeDisplay = useMemo(() => {
    const age = calculateAgeFromDateOfBirth(values.dateOfBirth)
    return age !== null ? String(age) : ''
  }, [values.dateOfBirth])

  const selectRequestType = (requestType: string) => {
    setValue('requestType', requestType)
    if (requestType === 'NON_EMERGENCY') {
      setValue('emergencyType', '')
      setValue('emergencyTypeOther', '')
      setValue('consciousStatus', '')
      setValue('breathingStatus', '')
      setValue('needsOxygen', false)
      setValue('needsStretcher', false)
    }
  }

  const setUnknownNationality = () => {
    setValue('nationalityType', 'UNKNOWN')
    setValue('nationalityUnknown', true)
    setValue('country', 'Unknown')
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude.toFixed(6))
        setValue('longitude', pos.coords.longitude.toFixed(6))
        toast.success('GPS location captured — dispatch can find you faster')
        setLocating(false)
      },
      () => {
        toast.error('Could not get location. Allow location access or enter address manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const shareGpsLocation = async () => {
    const lat = values.latitude
    const lng = values.longitude
    if (!lat || !lng) {
      toast.error('Capture GPS location first')
      return
    }
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    const text = `My location for ambulance pickup: ${lat}, ${lng}\n${mapsUrl}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Ambulance pickup location',
          text: `GPS coordinates: ${lat}, ${lng}`,
          url: mapsUrl,
        })
        toast.success('Location shared')
      } else {
        await navigator.clipboard.writeText(text)
        toast.success('Location link copied — paste to share')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Could not share location')
      }
    }
  }

  const goNext = () => {
    const err = validateStep(currentStep, values, { emergencyTypes })
    if (err) {
      toast.error(err)
      return
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const jumpToStep = (idx: number) => {
    if (idx <= stepIndex) setStepIndex(idx)
  }

  const onSubmit = async (data: HireFormValues) => {
    if (fleetStatus === 'unavailable' || fleet.available === 0) {
      toast.error('No ambulances are available right now. Please try again later or call the emergency hotline.')
      return
    }
    const urgencyErr = validateStep('urgency', data, { emergencyTypes })
    if (urgencyErr) {
      toast.error(urgencyErr)
      return
    }
    const err = validateStep('review', data, { emergencyTypes })
    if (err) {
      toast.error(err)
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE}/api/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(data, emergencyTypes)),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to create ambulance request')
      }
      const result = await response.json()
      const trackingCode = result.trackingCode || ''
      sessionStorage.removeItem(DRAFT_KEY)
      router.push(
        trackingCode
          ? `/hire-ambulance/success?code=${encodeURIComponent(trackingCode)}`
          : '/hire-ambulance/success',
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const priorityStyle = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    LOW: 'bg-blue-500 text-white',
  }[priority]

  if (fleetStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center px-4 pt-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto" />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Checking ambulance availability…</p>
        </div>
      </div>
    )
  }

  if (fleetStatus === 'unavailable') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-10 text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Truck className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">No Ambulances Available Right Now</h1>
              <p className="text-slate-300 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                We are sorry — all ambulances in our fleet are currently assigned or unavailable. Online requests
                cannot be accepted at this time.
              </p>
            </div>
            <div className="p-8 space-y-6">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-950 space-y-2">
                  <p className="font-bold">If this is a life-threatening emergency</p>
                  <p>
                    Please call our emergency hotline immediately. Do not wait for an ambulance to become available
                    online.
                  </p>
                  <a
                    href={`tel:${EMERGENCY_HOTLINE}`}
                    className="inline-flex items-center gap-2 font-black text-red-600 hover:text-red-700"
                  >
                    <Phone className="w-4 h-4" />
                    Call {EMERGENCY_HOTLINE}
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-600 space-y-2">
                <p>
                  For non-urgent transport, please try again shortly. Fleet status updates every 30 seconds when
                  ambulances return to service.
                </p>
                <p className="text-slate-500">
                  Our dispatch team apologizes for the inconvenience and is working to restore availability as quickly
                  as possible.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void loadPublicData()}
                  className="h-12 flex-1 rounded-xl bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 transition inline-flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Check Again
                </button>
                <Link
                  href="/"
                  className="h-12 flex-1 rounded-xl border-2 border-slate-200 text-slate-700 font-bold uppercase text-sm hover:bg-slate-50 transition inline-flex items-center justify-center"
                >
                  Return Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/40">
      {/* Sticky emergency bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
          <a
            href={`tel:${EMERGENCY_HOTLINE}`}
            className="flex items-center gap-2 font-bold text-red-400 hover:text-red-300 transition"
          >
            <Phone className="w-4 h-4 animate-pulse" />
            Emergency: {EMERGENCY_HOTLINE}
          </a>
          <div className="hidden sm:flex items-center gap-4 text-slate-300 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-green-400" />
              {fleet.available} ambulances ready
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              ~15 min avg response
            </span>
          </div>
          <Link href="/ambulance-tracking" className="text-xs font-bold uppercase tracking-wider hover:text-red-300">
            Track Request
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-28 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5" /> 24/7 Emergency Dispatch
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Request an <span className="text-red-600">Ambulance</span>
              </h1>
              <p className="text-slate-600 mt-3 max-w-xl text-lg">
                Fast, professional emergency medical transport. Complete the guided form — dispatch receives your case instantly.
              </p>
            </div>

            {/* Live status panel */}
            <div className="rounded-2xl bg-white/80 backdrop-blur border border-slate-100 p-5 shadow-lg space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Live Fleet Status</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{fleet.available}</p>
                  <p className="text-xs text-slate-500 font-medium">Available now</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                  style={{ width: fleet.total ? `${(fleet.available / fleet.total) * 100}%` : '60%' }}
                />
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${priorityStyle}`}>
                <Radio className="w-3.5 h-3.5" />
                Priority: {priority}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step progress */}
      <div className="sticky top-[7.25rem] z-30 bg-white/90 backdrop-blur border-y border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === stepIndex
              const done = i < stepIndex
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpToStep(i)}
                  disabled={i > stepIndex}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition shrink-0 ${
                    active
                      ? 'bg-red-600 text-white shadow-md shadow-red-200'
                      : done
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <form id="hire-ambulance-form" onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 py-8 pb-32">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">
          <div className="space-y-6 min-w-0">
            {/* STEP: Urgency */}
            {currentStep === 'urgency' && (
              <>
                <SectionCard title="Request Type" subtitle="How urgent is this transport?">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {REQUEST_TYPES.map((rt) => {
                      const Icon = rt.icon
                      const selected = values.requestType === rt.value
                      return (
                        <button
                          key={rt.value}
                          type="button"
                          onClick={() => selectRequestType(rt.value)}
                          className={`p-5 rounded-2xl border-2 text-left transition-all ${
                            selected ? `${rt.accent} ring-2` : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <Icon className={`w-8 h-8 mb-3 ${selected ? 'text-red-600' : 'text-slate-400'}`} />
                          <p className="font-bold text-slate-900">{rt.label}</p>
                          <p className="text-sm text-slate-500 mt-1">{rt.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </SectionCard>

                {isEmergency ? (
                  <>
                <SectionCard
                  title="Emergency Type"
                  subtitle="All types from Master Data → Emergency Configuration; choose Others to type your own"
                >
                  {loadingEmergencyTypes ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Loading emergency types…</span>
                    </div>
                  ) : emergencyTypes.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      Emergency types are not available right now. Please call {EMERGENCY_HOTLINE} directly.
                    </p>
                  ) : (
                    <>
                      <FieldLabel required>Emergency Type</FieldLabel>
                      <select
                        {...register('emergencyType', {
                          onChange: (e) => {
                            const selected = emergencyTypes.find((t) => t.id === e.target.value)
                            if (!isOtherEmergencyType(selected)) setValue('emergencyTypeOther', '')
                          },
                        })}
                        className={selectClass}
                      >
                        <option value="">Select emergency type</option>
                        {emergencyTypes.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.name}
                            {et.incidentCategory?.name ? ` — ${et.incidentCategory.name}` : ''}
                          </option>
                        ))}
                      </select>
                      {showEmergencyTypeOther && (
                        <div className="mt-4">
                          <FieldLabel required>Specify emergency type</FieldLabel>
                          <input
                            {...register('emergencyTypeOther', { required: true })}
                            className={inputClass}
                            placeholder="Type the emergency (required when Others is selected)"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Quick Triage" subtitle="Critical info for dispatch prioritization">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <FieldLabel required>Is the patient conscious?</FieldLabel>
                      <select {...register('consciousStatus')} className={selectClass}>
                        <option value="">Select</option>
                        <option value="CONSCIOUS">Yes — conscious</option>
                        <option value="UNCONSCIOUS">No — unconscious</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>Breathing status</FieldLabel>
                      <select {...register('breathingStatus')} className={selectClass}>
                        <option value="">Select</option>
                        <option value="NORMAL">Normal breathing</option>
                        <option value="DIFFICULTY">Difficulty breathing</option>
                        <option value="NOT_BREATHING">Not breathing</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>What happened?</FieldLabel>
                    <textarea
                      {...register('conditionDescription')}
                      rows={4}
                      placeholder="Describe the situation, symptoms, and when it started..."
                      className={`${inputClass} h-auto py-3 resize-none`}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" {...register('needsOxygen')} className="w-5 h-5 rounded text-red-600" />
                      <div className="flex items-center gap-2">
                        <Wind className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-slate-800">Needs oxygen</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" {...register('needsStretcher')} className="w-5 h-5 rounded text-red-600" />
                      <div className="flex items-center gap-2">
                        <StretchHorizontal className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-semibold text-slate-800">Needs stretcher</span>
                      </div>
                    </label>
                  </div>
                </SectionCard>
                  </>
                ) : (
                  <SectionCard
                    title="Transport Details"
                    subtitle="Optional — dispatch will confirm details when they contact you"
                  >
                    <FieldLabel>Reason for transport (optional)</FieldLabel>
                    <textarea
                      {...register('conditionDescription')}
                      rows={4}
                      placeholder="e.g. clinic appointment, hospital transfer, scheduled pickup, mobility assistance..."
                      className={`${inputClass} h-auto py-3 resize-none`}
                    />
                    <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                      Medical triage questions are not required for non-emergency requests. Our dispatch team can
                      update clinical details during handover or after the case is completed.
                    </p>
                  </SectionCard>
                )}
              </>
            )}

            {/* STEP: Identity */}
            {currentStep === 'identity' && (
              <SectionCard title="Who is calling?" subtitle="Tell us about yourself">
                <FieldLabel required>Are you the patient?</FieldLabel>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { value: 'YES', label: 'Yes, I am the patient', desc: 'Requesting for myself' },
                    { value: 'NO', label: 'No, calling for someone else', desc: 'Family, friend, or witness' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('isPatient', opt.value)}
                      className={`p-5 rounded-2xl border-2 text-left transition ${
                        values.isPatient === opt.value
                          ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-slate-900">{opt.label}</p>
                      <p className="text-sm text-slate-500 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {values.isPatient === 'NO' && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <FieldLabel required>Caller name</FieldLabel>
                      <input {...register('callerName')} className={inputClass} placeholder="Your full name" />
                    </div>
                    <div>
                      <FieldLabel required>Relationship to patient</FieldLabel>
                      <select {...register('callerRelationship')} className={selectClass}>
                        <option value="">Select</option>
                        <option value="FAMILY">Family</option>
                        <option value="FRIEND">Friend</option>
                        <option value="WITNESS">Witness</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Phone number</FieldLabel>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                        +252
                      </span>
                      <input
                        {...register('callerPhone')}
                        className={`${inputClass} rounded-l-none`}
                        placeholder="61X XXX XXX"
                        onChange={(e) => setValue('callerPhone', formatSomaliaPhone(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Alternate phone (optional)</FieldLabel>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                        +252
                      </span>
                      <input
                        {...register('callerAltPhone')}
                        className={`${inputClass} rounded-l-none`}
                        placeholder="Backup number"
                        onChange={(e) => setValue('callerAltPhone', formatSomaliaPhone(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* STEP: Patient */}
            {currentStep === 'patient' && (
              <SectionCard title="Patient Information" subtitle="Medical details for the response team">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FieldLabel required={values.isPatient === 'YES'}>
                      Patient full name
                      {values.isPatient === 'NO' ? ' (optional if unknown)' : ''}
                    </FieldLabel>
                    <input {...register('patientName')} className={inputClass} placeholder="Patient's full name" />
                  </div>
                  <div>
                    <FieldLabel required>Date of birth</FieldLabel>
                    <input
                      type="date"
                      {...register('dateOfBirth')}
                      className={inputClass}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Estimated age</FieldLabel>
                    <input
                      type="text"
                      readOnly
                      value={estimatedAgeDisplay}
                      className={`${inputClass} bg-slate-50 text-slate-700 cursor-not-allowed`}
                      placeholder="Set date of birth first"
                    />
                    <p className="text-xs text-slate-500 mt-1">Calculated automatically from date of birth</p>
                  </div>
                  <div>
                    <FieldLabel required>Gender</FieldLabel>
                    <select {...register('gender')} className={selectClass}>
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel required={values.isPatient === 'YES'}>
                      Marital status
                      {values.isPatient === 'NO' ? ' (optional if unknown)' : ''}
                    </FieldLabel>
                    <select {...register('maritalStatus')} className={selectClass}>
                      <option value="">Select</option>
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Blood group (optional)</FieldLabel>
                    <select {...register('bloodGroup')} className={selectClass}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* STEP: Location */}
            {currentStep === 'location' && (
              <>
                <SectionCard
                  title="Pickup Location"
                  subtitle="Provide GPS coordinates or a pickup address — at least one is required"
                >
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6 text-sm text-slate-700">
                    {hasLocation ? (
                      <p className="font-semibold text-green-800">
                        Location provided — {gpsShared ? 'GPS captured' : 'address entered'}
                        {gpsShared && manualAddress ? ' (address added for clarity)' : ''}.
                      </p>
                    ) : (
                      <p>
                        Share your GPS location <strong>or</strong> complete the pickup address below. You do not need
                        both, but at least one is required to dispatch an ambulance.
                      </p>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="GPS Location"
                  subtitle="Pin the exact spot where the patient is — share GPS or describe the building and street"
                >
                  <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={captureLocation}
                        disabled={locating}
                        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition disabled:opacity-60 shadow-md shadow-red-200"
                      >
                        {locating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Navigation className="w-5 h-5" />
                        )}
                        {locating ? 'Getting location…' : 'Share my GPS location'}
                      </button>
                      {gpsShared && (
                        <>
                          <button
                            type="button"
                            onClick={shareGpsLocation}
                            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
                          >
                            <Share2 className="w-5 h-5" />
                            Share with others
                          </button>
                          <a
                            href={googleMapsUrl(parseFloat(values.latitude), parseFloat(values.longitude))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border-2 border-slate-200 text-slate-800 font-bold text-sm hover:bg-white transition"
                          >
                            <ExternalLink className="w-5 h-5" />
                            Adjust pin in Maps
                          </a>
                        </>
                      )}
                    </div>

                    {gpsShared && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-green-800 font-semibold bg-green-100 px-4 py-3 rounded-xl border border-green-200">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>
                            Patient location pinned: {values.latitude}, {values.longitude}
                          </span>
                        </div>
                        <iframe
                          title="Patient pickup map"
                          className="w-full h-48 rounded-xl border border-green-200 bg-white"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${values.latitude},${values.longitude}&z=17&output=embed`}
                        />
                        <p className="text-xs text-slate-600">
                          The map shows the patient&apos;s GPS pin. If it is not exact, tap{' '}
                          <strong>Adjust pin in Maps</strong> or fine-tune the coordinates below.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel>Latitude (fine-tune)</FieldLabel>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={inputClass}
                              value={values.latitude}
                              onChange={(e) => setValue('latitude', e.target.value)}
                            />
                          </div>
                          <div>
                            <FieldLabel>Longitude (fine-tune)</FieldLabel>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={inputClass}
                              value={values.longitude}
                              onChange={(e) => setValue('longitude', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Where is the patient? (building, street, floor)</FieldLabel>
                          <textarea
                            {...register('gpsLocationDescription')}
                            rows={3}
                            className={`${inputClass} h-auto py-3 resize-none`}
                            placeholder="e.g. Blue building near Z block, 2nd floor, Gate 3, Wadajir street…"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Help crews find the patient even if GPS is approximate — describe the building, street, or
                            landmark.
                          </p>
                        </div>
                      </>
                    )}

                    <p className="text-sm text-slate-600">
                      {gpsShared
                        ? 'GPS captured. Add building or street details above, or continue with the address section below.'
                        : manualAddress
                          ? 'Address provided. GPS is optional but pins the patient faster.'
                          : 'Share GPS to mark where the patient is, or enter the pickup address below.'}
                    </p>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Pickup Address"
                  subtitle={gpsShared ? 'Optional — add street or area details' : 'Required when GPS is not shared'}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required={!gpsShared}>Region</FieldLabel>
                      <select {...register('regionId')} className={selectClass}>
                        <option value="">Select region</option>
                        {regions.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel required={!gpsShared}>District</FieldLabel>
                      <select
                        {...register('districtId')}
                        disabled={!values.regionId}
                        className={`${selectClass} disabled:bg-slate-50 disabled:text-slate-400`}
                      >
                        <option value="">Select district</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel required={!gpsShared}>Area / Sub-area</FieldLabel>
                      <input {...register('areaName')} className={inputClass} placeholder="e.g. Hodan, Wadajir" />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Additional directions (optional)</FieldLabel>
                      <textarea
                        {...register('additionalDirections')}
                        rows={3}
                        className={`${inputClass} h-auto py-3 resize-none`}
                        placeholder="Street name, gate color, floor number..."
                      />
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {/* STEP: Details */}
            {currentStep === 'details' && (
              <SectionCard title="Additional Details" subtitle="Language, nationality, and destination">
                <div className="space-y-6">
                  <div>
                    <FieldLabel required>Nationality</FieldLabel>
                    <div className="grid sm:grid-cols-2 gap-4 mt-2">
                      {[
                        { value: 'LOCAL', label: 'Somali Citizen 🇸🇴' },
                        { value: 'INTERNATIONAL', label: 'International 🌍' },
                      ].map((n) => (
                        <label
                          key={n.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                            values.nationalityType === n.value && !values.nationalityUnknown
                              ? 'border-red-500 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            value={n.value}
                            checked={values.nationalityType === n.value && !values.nationalityUnknown}
                            onChange={() => {
                              setValue('nationalityType', n.value)
                              setValue('nationalityUnknown', false)
                              if (n.value === 'LOCAL') setValue('country', 'Somalia')
                              else setValue('country', '')
                            }}
                            className="w-5 h-5 text-red-600"
                          />
                          <span className="font-semibold text-slate-800">{n.label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={setUnknownNationality}
                      className={`mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border-2 text-sm font-bold transition ${
                        values.nationalityType === 'UNKNOWN' || values.nationalityUnknown
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      Unknown nationality
                    </button>
                    {(values.nationalityType === 'UNKNOWN' || values.nationalityUnknown) && (
                      <p className="text-xs text-amber-800 mt-2 font-medium">
                        Nationality not known — dispatch will confirm with the patient or caller.
                      </p>
                    )}
                  </div>

                  {values.nationalityType === 'INTERNATIONAL' && !values.nationalityUnknown && (
                    <div>
                      <FieldLabel required>Country</FieldLabel>
                      <select {...register('country')} className={selectClass}>
                        <option value="">Select country</option>
                        {COUNTRY_NAMES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Don&apos;t know the patient&apos;s country? Tap <strong>Unknown nationality</strong> above.
                      </p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required={values.isPatient === 'YES'}>
                        Preferred language
                        {values.isPatient === 'NO' ? ' (optional)' : ''}
                      </FieldLabel>
                      <select {...register('preferredLanguage')} className={selectClass}>
                        <option value="">Select</option>
                        <option value="SOMALI">Somali</option>
                        <option value="ENGLISH">English</option>
                        <option value="ARABIC">Arabic</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Destination hospital (optional)</FieldLabel>
                      <input
                        list="hospitals-list"
                        {...register('destinationHospital')}
                        className={inputClass}
                        placeholder="Type or select preferred hospital"
                      />
                      <datalist id="hospitals-list">
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Special instructions (optional)</FieldLabel>
                      <input
                        {...register('specialInstructions')}
                        className={inputClass}
                        placeholder="Gate code, allergies, accessibility needs..."
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* STEP: Review */}
            {currentStep === 'review' && (
              <>
                <SectionCard title="Review Your Request" subtitle="Confirm details before dispatch">
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Request type',
                        value: isEmergency ? 'Emergency' : 'Non-Emergency',
                      },
                      ...(isEmergency
                        ? [{ label: 'Emergency type', value: emergencyTypeDisplayLabel }]
                        : []),
                      { label: 'Priority', value: priority },
                      { label: 'Patient', value: values.patientName || (values.isPatient === 'NO' ? 'Not provided' : '—') },
                      {
                        label: 'Age',
                        value: estimatedAgeDisplay ? `${estimatedAgeDisplay} years` : '—',
                      },
                      { label: 'Phone', value: values.callerPhone ? `+252 ${values.callerPhone}` : '' },
                      {
                        label: 'Location',
                        value: gpsShared
                          ? `GPS: ${values.latitude}, ${values.longitude}${
                              values.gpsLocationDescription
                                ? ` · ${values.gpsLocationDescription}`
                                : manualAddress
                                  ? ` · ${values.areaName}`
                                  : ''
                            }`
                          : values.areaName || '—',
                      },
                      { label: 'Region', value: regions.find((r) => r.id === values.regionId)?.name },
                      ...(values.conditionDescription.trim()
                        ? [
                            {
                              label: isEmergency ? 'Condition' : 'Transport notes',
                              value:
                                values.conditionDescription.slice(0, 80) +
                                (values.conditionDescription.length > 80 ? '…' : ''),
                            },
                          ]
                        : []),
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-slate-50 text-sm">
                        <span className="text-slate-500 font-medium">{row.label}</span>
                        <span className="text-slate-900 font-semibold text-right">{row.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900">
                    False emergency requests delay real patients. Only submit if you genuinely need ambulance service.
                  </p>
                </div>

                <label className="flex items-start gap-3 p-5 rounded-2xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                  <input type="checkbox" {...register('consent')} className="mt-1 w-5 h-5 rounded text-red-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    I confirm this is a genuine request and the information provided is accurate.
                  </span>
                </label>
              </>
            )}
          </div>

          {/* Sidebar tips */}
          <aside className="hidden lg:block space-y-4">
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm sticky top-44">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Need help?</p>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  Your data is sent directly to dispatch — encrypted in transit.
                </li>
                <li className="flex gap-2">
                  <Users className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  A dispatcher will call you to confirm details.
                </li>
                <li className="flex gap-2">
                  <Phone className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  For immediate life-threatening emergencies, also call{' '}
                  <a href={`tel:${EMERGENCY_HOTLINE}`} className="font-bold text-red-600">{EMERGENCY_HOTLINE}</a>.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </form>

      {/* Fixed footer nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:block">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <div className="flex gap-3 ml-auto w-full sm:w-auto">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-2 border-slate-200 font-bold text-sm uppercase text-slate-700 hover:bg-slate-50 transition inline-flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-red-600 text-white font-bold text-sm uppercase hover:bg-red-700 transition inline-flex items-center justify-center gap-1 shadow-lg shadow-red-200"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="hire-ambulance-form"
                disabled={submitting}
                className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-red-600 text-white font-bold text-sm uppercase hover:bg-red-700 transition disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-lg shadow-red-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Dispatching…
                  </>
                ) : (
                  <>Request Ambulance</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
