'use client'

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  HeartPulse,
  Loader2,
  Phone,
  Shield,
  Truck,
  User,
  Wind,
} from 'lucide-react'
import { COUNTRY_NAMES } from '@/lib/countries'
import { fetchFleetAvailability } from '@/lib/emergency/emergencyTypes'
import { fetchHireEmergencyTypes } from '@/lib/hire-ambulance/emergencyTypes'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import {
  AGE_GROUPS,
  API_BASE,
  BLEEDING_STATUSES,
  BLOOD_GROUPS,
  DRAFT_KEY,
  EMERGENCY_HOTLINE,
  HOSPITAL_TRANSPORT_TYPES,
  LANG_KEY,
  REQUEST_TYPES,
  STEPS,
  TRANSPORT_TYPES,
  type StepId,
} from './constants'
import {
  buildPayload,
  calculateAgeFromDateOfBirth,
  computePriority,
  defaultFormValues,
  formatSomaliaPhone,
  hasPickupLocation,
  isFuneralTransport,
  isHospitalTransport,
  isOtherEmergencyType,
  isOtherTransportType,
  transportTypeLabel,
  validateAllSteps,
  validateStep,
  type HireEmergencyTypeOption,
  type HireFormValues,
} from './formHelpers'
import { getHireT, type HireLang } from './translations'

type Region = { id: string; name: string }
type District = { id: string; name: string }
type Hospital = { id: string; name: string }

const inputClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
const selectClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100'
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2'

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className={labelClass}>
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

const STEP_ICONS: Record<StepId, ComponentType<{ className?: string }>> = {
  urgency: Clock,
  identity: User,
  patient: HeartPulse,
  location: Globe,
  details: Wind,
  review: Shield,
}

export default function HireAmbulanceWizard() {
  const router = useRouter()
  const submitLockRef = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [lang, setLang] = useState<HireLang>('en')
  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [fleet, setFleet] = useState<{ available: number; total: number }>({ available: 0, total: 0 })
  const [fleetStatus, setFleetStatus] = useState<'loading' | 'available' | 'unavailable'>('loading')
  const [emergencyTypes, setEmergencyTypes] = useState<HireEmergencyTypeOption[]>([])
  const [loadingEmergencyTypes, setLoadingEmergencyTypes] = useState(true)
  const [emergencyTypesError, setEmergencyTypesError] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, getValues, control } = useForm<HireFormValues>({
    defaultValues: defaultFormValues,
  })

  const [
    requestType,
    transportType,
    isPatient,
    regionId,
    districtId,
    emergencyType,
    ageGroup,
    dateOfBirth,
    nationalityType,
    country,
    breathingStatus,
    consciousStatus,
    bleedingStatus,
  ] = useWatch({
    control,
    name: [
      'requestType',
      'transportType',
      'isPatient',
      'regionId',
      'districtId',
      'emergencyType',
      'ageGroup',
      'dateOfBirth',
      'nationalityType',
      'country',
      'breathingStatus',
      'consciousStatus',
      'bleedingStatus',
    ],
  })

  const triageValues = useMemo(
    () =>
      ({
        requestType: requestType ?? defaultFormValues.requestType,
        breathingStatus: breathingStatus ?? '',
        consciousStatus: consciousStatus ?? '',
        bleedingStatus: bleedingStatus ?? '',
      }) as HireFormValues,
    [bleedingStatus, breathingStatus, consciousStatus, requestType],
  )
  const t = useMemo(() => getHireT(lang), [lang])
  const currentStep = STEPS[stepIndex].id
  const isEmergency = requestType === 'EMERGENCY'
  const priority = useMemo(() => computePriority(triageValues), [triageValues])
  const priorityStyle = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    LOW: 'bg-blue-500 text-white',
  }[priority]
  const selectedEmergencyType = useMemo(
    () => emergencyTypes.find((item) => item.id === emergencyType),
    [emergencyTypes, emergencyType],
  )
  const showEmergencyTypeOther = isOtherEmergencyType(selectedEmergencyType)
  const showOtherTransport = isOtherTransportType(transportType ?? '')
  const needsHospitalDestination = !isEmergency && isHospitalTransport(transportType ?? '')
  const needsFuneralDestination = !isEmergency && isFuneralTransport(transportType ?? '')
  const estimatedAgeDisplay = useMemo(() => {
    if (isPatient === 'YES') {
      const age = calculateAgeFromDateOfBirth(dateOfBirth ?? '')
      return age === null ? '' : String(age)
    }
    const selected = AGE_GROUPS.find((item) => item.value === ageGroup)
    return selected ? String(selected.age) : ''
  }, [ageGroup, dateOfBirth, isPatient])

  const currentRegion = useMemo(
    () => regions.find((item) => item.id === regionId)?.name || '—',
    [regions, regionId],
  )
  const setLanguage = useCallback((next: HireLang) => {
    setLang(next)
    try {
      sessionStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore session storage errors */
    }
  }, [])

  const loadPublicData = useCallback(async () => {
    setFleetStatus((prev) => (prev === 'available' ? prev : 'loading'))
    setLoadingEmergencyTypes(true)
    setEmergencyTypesError(false)

    try {
      const [regionsRes, hospitalsRes, fleetInfo, emergency] = await Promise.all([
        fetch(`${API_BASE}/api/setup/regions`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/hospitals`, { cache: 'no-store' }),
        fetchFleetAvailability(),
        fetchHireEmergencyTypes(),
      ])

      if (regionsRes.ok) {
        setRegions((await regionsRes.json()) as Region[])
      }
      if (hospitalsRes.ok) {
        setHospitals((await hospitalsRes.json()) as Hospital[])
      }

      setEmergencyTypes(emergency)
      setEmergencyTypesError(emergency.length === 0)

      if (fleetInfo) {
        setFleet({ available: fleetInfo.available, total: fleetInfo.total })
        setFleetStatus(fleetInfo.canAcceptRequests ? 'available' : 'unavailable')
      } else {
        setFleet({ available: 0, total: 0 })
        setFleetStatus('unavailable')
      }
    } catch {
      setEmergencyTypes([])
      setEmergencyTypesError(true)
      setFleet({ available: 0, total: 0 })
      setFleetStatus('unavailable')
    } finally {
      setLoadingEmergencyTypes(false)
    }
  }, [])

  useEffect(() => {
    try {
      const savedLang = sessionStorage.getItem(LANG_KEY)
      if (savedLang === 'en' || savedLang === 'so') {
        setLang(savedLang)
      }
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as { form?: Partial<HireFormValues>; stepIndex?: number; lang?: HireLang }
      if (draft.form) {
        reset({ ...defaultFormValues, ...draft.form })
      }
      if (typeof draft.stepIndex === 'number') {
        setStepIndex(Math.max(0, Math.min(draft.stepIndex, STEPS.length - 1)))
      }
      if (draft.lang === 'en' || draft.lang === 'so') {
        setLang(draft.lang)
      }
    } catch {
      /* ignore */
    }
  }, [reset])

  useEffect(() => {
    void loadPublicData()
    const timer = setInterval(() => {
      void loadPublicData()
    }, 60000)
    return () => clearInterval(timer)
  }, [loadPublicData])

  useEffect(() => {
    if (!regionId) {
      setDistricts([])
      setValue('districtId', '')
      return
    }
    const loadDistricts = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/setup/districts?regionId=${regionId}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          setDistricts([])
          setValue('districtId', '')
          return
        }
        const rows = (await response.json()) as District[]
        setDistricts(rows)
        if (districtId && !rows.some((item) => item.id === districtId)) {
          setValue('districtId', '')
        }
      } catch {
        setDistricts([])
        setValue('districtId', '')
      }
    }
    void loadDistricts()
  }, [districtId, regionId, setValue])

  useEffect(() => {
    const subscription = watch(() => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
      }
      draftTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ form: getValues(), stepIndex, lang }),
          )
        } catch {
          /* ignore */
        }
      }, 2000)
    })
    return () => {
      subscription.unsubscribe()
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
      }
    }
  }, [getValues, lang, stepIndex, watch])

  const handleRequestTypeChange = (nextRequestType: string) => {
    setValue('requestType', nextRequestType)
    if (nextRequestType === 'EMERGENCY') {
      setValue('transportType', '')
      setValue('transportTypeOther', '')
      return
    }
    setValue('emergencyType', '')
    setValue('emergencyTypeOther', '')
    setValue('consciousStatus', '')
    setValue('breathingStatus', '')
    setValue('bleedingStatus', '')
    setValue('needsOxygen', false)
    setValue('needsStretcher', false)
  }

  const nextStep = () => {
    const formValues = getValues()
    const validationError = validateStep(currentStep, formValues, { emergencyTypes, t })
    if (validationError) {
      toast.error(validationError)
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (data: HireFormValues) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)

    try {
      if (fleetStatus === 'unavailable' || fleet.available <= 0) {
        toast.error(t.errors.noFleet)
        return
      }

      const allValidation = validateAllSteps(data, { emergencyTypes, t })
      if (allValidation) {
        const nextIndex = STEPS.findIndex((step) => step.id === allValidation.step)
        if (nextIndex >= 0) setStepIndex(nextIndex)
        toast.error(allValidation.message)
        return
      }

      const response = await fetch(`${API_BASE}/api/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(data, emergencyTypes)),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.message || t.errors.submitFailed)
      }

      const result = (await response.json()) as { trackingCode?: string }
      const code = encodeURIComponent(result.trackingCode || '')
      const at = encodeURIComponent(new Date().toISOString())
      const langParam = encodeURIComponent(lang)
      sessionStorage.removeItem(DRAFT_KEY)
      router.push(`/hire-ambulance/success?code=${code}&at=${at}&lang=${langParam}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : t.errors.submitFailed
      toast.error(message || t.errors.submitFailed)
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const goToStep = (index: number) => {
    if (index <= stepIndex) {
      setStepIndex(index)
    }
  }

  const reviewForm = currentStep === 'review' ? getValues() : null
  const reviewRows = reviewForm
    ? [
        { label: t.review.requestType, value: isEmergency ? t.requestType.emergency : t.requestType.nonEmergency },
        ...(!isEmergency
          ? [{ label: t.review.transportType, value: transportTypeLabel(reviewForm, t) || '—' }]
          : []),
        ...(isEmergency
          ? [
              {
                label: t.review.emergencyType,
                value: selectedEmergencyType
                  ? isOtherEmergencyType(selectedEmergencyType)
                    ? reviewForm.emergencyTypeOther || selectedEmergencyType.name
                    : selectedEmergencyType.name
                  : '—',
              },
            ]
          : []),
        { label: t.review.priority, value: priority },
        { label: t.review.patient, value: reviewForm.patientName || '—' },
        { label: t.review.age, value: estimatedAgeDisplay || '—' },
        {
          label: t.review.phone,
          value: reviewForm.callerPhone ? `+252 ${reviewForm.callerPhone}` : '—',
        },
        {
          label: t.review.location,
          value: hasPickupLocation(reviewForm)
            ? `${reviewForm.areaName}, ${reviewForm.landmarkDescription}`
            : '—',
        },
        { label: t.review.region, value: currentRegion },
        ...(reviewForm.destinationHospital.trim()
          ? [{ label: t.review.destination, value: reviewForm.destinationHospital.trim() }]
          : []),
        ...(reviewForm.conditionDescription.trim()
          ? [
              {
                label: isEmergency ? t.review.condition : t.review.transportNotes,
                value: reviewForm.conditionDescription.trim(),
              },
            ]
          : []),
      ]
    : []

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/40 pb-32 ${PUBLIC_HEADER_OFFSET}`}>
      <section className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <a
            href={`tel:${EMERGENCY_HOTLINE}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            <Phone className="h-4 w-4" />
            {t.emergencyHotline}: {EMERGENCY_HOTLINE}
          </a>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`h-8 rounded-lg px-3 text-xs font-bold uppercase ${
                lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('so')}
              className={`h-8 rounded-lg px-3 text-xs font-bold uppercase ${
                lang === 'so' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              SO
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 pt-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t.heroTitle} <span className="text-red-600">{t.heroTitleAccent}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">{t.heroSubtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t.fleetLive}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                <Truck className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{fleet.available}</p>
                <p className="text-xs text-slate-500">{t.fleetAvailable}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all"
                style={{ width: fleet.total ? `${(fleet.available / fleet.total) * 100}%` : '0%' }}
              />
            </div>
            <div className={`mt-3 inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold ${priorityStyle}`}>
              {t.priority}: {priority}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[7.25rem] z-20 border-y border-slate-100 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map((step, index) => {
              const Icon = STEP_ICONS[step.id]
              const active = index === stepIndex
              const done = index < stepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={index > stepIndex}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? 'bg-red-600 text-white'
                      : done
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.steps[step.id]}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <form
        id="hire-ambulance-form"
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_280px]"
      >
        <div className="space-y-6">
          {fleetStatus !== 'available' ? (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                fleetStatus === 'loading'
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {fleetStatus === 'loading' ? (
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                )}
                <p>
                  {fleetStatus === 'loading'
                    ? t.fleet.checking
                    : `${t.fleet.unavailableDesc} ${t.fleet.callHotline} ${EMERGENCY_HOTLINE}`}
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 'urgency' ? (
            <>
              <SectionCard title={t.requestType.title} subtitle={t.requestType.subtitle}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {REQUEST_TYPES.map((typeOption) => {
                    const selected = requestType === typeOption.value
                    return (
                      <button
                        key={typeOption.value}
                        type="button"
                        onClick={() => handleRequestTypeChange(typeOption.value)}
                        className={`rounded-2xl border-2 p-5 text-left transition ${
                          selected ? `${typeOption.accent} ring-2` : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-bold text-slate-900">
                          {typeOption.value === 'EMERGENCY' ? t.requestType.emergency : t.requestType.nonEmergency}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {typeOption.value === 'EMERGENCY'
                            ? t.requestType.emergencyDesc
                            : t.requestType.nonEmergencyDesc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </SectionCard>

              {isEmergency ? (
                <>
                  <SectionCard title={t.emergencyType.title} subtitle={t.emergencyType.subtitle}>
                    {loadingEmergencyTypes ? (
                      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.emergencyType.loading}
                      </div>
                    ) : (
                      <>
                        <FieldLabel>{t.emergencyType.label}</FieldLabel>
                        <select
                          {...register('emergencyType', {
                            onChange: (event) => {
                              const selected = emergencyTypes.find((item) => item.id === event.target.value)
                              if (!isOtherEmergencyType(selected)) {
                                setValue('emergencyTypeOther', '')
                              }
                            },
                          })}
                          className={selectClass}
                        >
                          <option value="">{t.triage.select}</option>
                          {emergencyTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        {showEmergencyTypeOther ? (
                          <div className="mt-4">
                            <FieldLabel required>{t.emergencyType.otherLabel}</FieldLabel>
                            <input
                              {...register('emergencyTypeOther')}
                              className={inputClass}
                              placeholder={t.emergencyType.otherPlaceholder}
                            />
                          </div>
                        ) : null}
                        {emergencyTypesError ? (
                          <button
                            type="button"
                            onClick={() => void loadPublicData()}
                            className="mt-4 text-sm font-semibold text-red-700 hover:text-red-800"
                          >
                            {t.emergencyType.retry}
                          </button>
                        ) : null}
                      </>
                    )}
                  </SectionCard>

                  <SectionCard title={t.triage.title} subtitle={t.triage.subtitle}>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <FieldLabel required>{t.triage.conscious}</FieldLabel>
                        <select {...register('consciousStatus')} className={selectClass}>
                          <option value="">{t.triage.select}</option>
                          <option value="CONSCIOUS">{t.triage.consciousYes}</option>
                          <option value="UNCONSCIOUS">{t.triage.consciousNo}</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel required>{t.triage.breathing}</FieldLabel>
                        <select {...register('breathingStatus')} className={selectClass}>
                          <option value="">{t.triage.select}</option>
                          <option value="NORMAL">{t.triage.breathNormal}</option>
                          <option value="DIFFICULTY">{t.triage.breathDifficulty}</option>
                          <option value="NOT_BREATHING">{t.triage.breathNone}</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel required>{t.triage.bleeding}</FieldLabel>
                        <select {...register('bleedingStatus')} className={selectClass}>
                          <option value="">{t.triage.select}</option>
                          {BLEEDING_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.value === 'NONE'
                                ? t.triage.bleedNone
                                : status.value === 'MINOR'
                                  ? t.triage.bleedMinor
                                  : status.value === 'SEVERE'
                                    ? t.triage.bleedSevere
                                    : t.triage.bleedHeavy}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <FieldLabel>{t.triage.condition}</FieldLabel>
                      <textarea
                        {...register('conditionDescription')}
                        rows={4}
                        className={`${inputClass} h-auto resize-none py-3`}
                        placeholder={t.triage.conditionPlaceholder}
                      />
                    </div>
                  </SectionCard>
                </>
              ) : (
                <SectionCard title={t.transport.title} subtitle={t.transport.subtitle}>
                  <div>
                    <FieldLabel required>{t.transport.typeLabel}</FieldLabel>
                    <select
                      {...register('transportType', {
                        onChange: (event) => {
                          const selected = event.target.value
                          if (!isOtherTransportType(selected)) {
                            setValue('transportTypeOther', '')
                          }
                          if (!HOSPITAL_TRANSPORT_TYPES.includes(selected as (typeof HOSPITAL_TRANSPORT_TYPES)[number])) {
                            if (!isFuneralTransport(selected)) {
                              setValue('destinationHospital', '')
                            }
                          }
                        },
                      })}
                      className={selectClass}
                    >
                      <option value="">{t.triage.select}</option>
                      {TRANSPORT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {t.transportTypes[type.value]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {showOtherTransport ? (
                    <div className="mt-4">
                      <FieldLabel required>{t.transport.otherLabel}</FieldLabel>
                      <input
                        {...register('transportTypeOther')}
                        className={inputClass}
                        placeholder={t.transport.otherPlaceholder}
                      />
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <FieldLabel>{t.transport.notesLabel}</FieldLabel>
                    <textarea
                      {...register('conditionDescription')}
                      rows={4}
                      className={`${inputClass} h-auto resize-none py-3`}
                      placeholder={t.transport.notesPlaceholder}
                    />
                  </div>
                </SectionCard>
              )}
            </>
          ) : null}

          {currentStep === 'identity' ? (
            <SectionCard title={t.identity.title} subtitle={t.identity.subtitle}>
              <FieldLabel required>{t.identity.areYouPatient}</FieldLabel>
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {[
                  { value: 'YES', title: t.identity.imPatient, description: t.identity.imPatientDesc },
                  { value: 'NO', title: t.identity.someoneElse, description: t.identity.someoneElseDesc },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue('isPatient', item.value)}
                    className={`rounded-2xl border-2 p-5 text-left transition ${
                      isPatient === item.value
                        ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </button>
                ))}
              </div>

              {isPatient === 'NO' ? (
                <div className="mb-6 grid gap-4 border-b border-slate-100 pb-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>{t.identity.callerName}</FieldLabel>
                    <input {...register('callerName')} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel required>{t.identity.relationship}</FieldLabel>
                    <select {...register('callerRelationship')} className={selectClass}>
                      <option value="">{t.triage.select}</option>
                      <option value="FAMILY">{t.identity.relationships.FAMILY}</option>
                      <option value="FRIEND">{t.identity.relationships.FRIEND}</option>
                      <option value="WITNESS">{t.identity.relationships.WITNESS}</option>
                      <option value="OTHER">{t.identity.relationships.OTHER}</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>{t.identity.phone}</FieldLabel>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
                      +252
                    </span>
                    <input
                      {...register('callerPhone')}
                      className={`${inputClass} rounded-l-none`}
                      placeholder={t.identity.phonePlaceholder}
                      onChange={(event) => setValue('callerPhone', formatSomaliaPhone(event.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>{t.identity.altPhone}</FieldLabel>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
                      +252
                    </span>
                    <input
                      {...register('callerAltPhone')}
                      className={`${inputClass} rounded-l-none`}
                      placeholder={t.identity.altPlaceholder}
                      onChange={(event) => setValue('callerAltPhone', formatSomaliaPhone(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 'patient' ? (
            <SectionCard title={t.patient.title} subtitle={t.patient.subtitle}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required={isPatient === 'YES'}>{t.patient.fullName}</FieldLabel>
                  <input {...register('patientName')} className={inputClass} />
                </div>

                {isPatient === 'YES' ? (
                  <div>
                    <FieldLabel required>{t.patient.dob}</FieldLabel>
                    <input
                      type="date"
                      {...register('dateOfBirth')}
                      className={inputClass}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                ) : (
                  <div>
                    <FieldLabel required>{t.patient.ageGroup}</FieldLabel>
                    <select {...register('ageGroup')} className={selectClass}>
                      <option value="">{t.triage.select}</option>
                      {AGE_GROUPS.map((group) => (
                        <option key={group.value} value={group.value}>
                          {t.ageGroups[group.value]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <FieldLabel>{t.patient.estimatedAge}</FieldLabel>
                  <input
                    readOnly
                    value={estimatedAgeDisplay}
                    className={`${inputClass} cursor-not-allowed bg-slate-50`}
                    placeholder="—"
                  />
                </div>

                <div>
                  <FieldLabel>{t.patient.gender}</FieldLabel>
                  <select {...register('gender')} className={selectClass}>
                    <option value="">{t.triage.select}</option>
                    <option value="MALE">{t.patient.genderMale}</option>
                    <option value="FEMALE">{t.patient.genderFemale}</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>{t.patient.marital}</FieldLabel>
                  <select {...register('maritalStatus')} className={selectClass}>
                    <option value="">{t.triage.select}</option>
                    <option value="SINGLE">{t.patient.single}</option>
                    <option value="MARRIED">{t.patient.married}</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>{t.patient.blood}</FieldLabel>
                  <select {...register('bloodGroup')} className={selectClass}>
                    <option value="">{t.triage.select}</option>
                    {BLOOD_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {group === 'UNKNOWN' ? t.patient.bloodUnknown : group}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 'location' ? (
            <SectionCard
              title={needsFuneralDestination ? t.location.pickupFuneral : t.location.pickupTitle}
              subtitle={needsFuneralDestination ? t.location.pickupFuneralSubtitle : t.location.pickupSubtitle}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>{t.location.region}</FieldLabel>
                  <select {...register('regionId')} className={selectClass}>
                    <option value="">{t.location.selectRegion}</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel required>{t.location.district}</FieldLabel>
                  <select
                    {...register('districtId')}
                    disabled={!regionId}
                    className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                  >
                    <option value="">{t.location.selectDistrict}</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>{t.location.area}</FieldLabel>
                  <input {...register('areaName')} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>{t.location.landmark}</FieldLabel>
                  <textarea
                    {...register('landmarkDescription')}
                    rows={3}
                    className={`${inputClass} h-auto resize-none py-3`}
                    placeholder={t.location.landmarkPlaceholder}
                  />
                </div>

                {needsFuneralDestination ? (
                  <div className="sm:col-span-2">
                    <FieldLabel required>{t.location.destinationFuneral}</FieldLabel>
                    <input
                      {...register('destinationHospital')}
                      className={inputClass}
                      placeholder={t.location.destinationFuneralHint}
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 'details' ? (
            <SectionCard title={t.details.title} subtitle={t.details.subtitle}>
              <div className="space-y-6">
                <div>
                  <FieldLabel>{t.details.nationality}</FieldLabel>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { value: 'LOCAL', label: t.details.local },
                      { value: 'INTERNATIONAL', label: t.details.international },
                    ].map((item) => (
                      <label
                        key={item.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                          nationalityType === item.value
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={nationalityType === item.value}
                          onChange={() => {
                            setValue('nationalityType', item.value)
                            if (item.value === 'LOCAL') {
                              setValue('country', 'Somalia')
                            } else if (country === 'Somalia') {
                              setValue('country', '')
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span className="font-semibold text-slate-800">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {nationalityType === 'INTERNATIONAL' ? (
                  <div>
                    <FieldLabel>{t.details.country}</FieldLabel>
                    <select {...register('country')} className={selectClass}>
                      <option value="">{t.details.selectCountry}</option>
                      {COUNTRY_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel required={needsHospitalDestination}>
                      {t.details.destinationHospital}
                    </FieldLabel>
                    <input
                      list="hire-hospital-list"
                      {...register('destinationHospital')}
                      className={inputClass}
                      placeholder={t.details.destinationHospitalPlaceholder}
                    />
                    <datalist id="hire-hospital-list">
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <FieldLabel>{t.details.preferredLang}</FieldLabel>
                    <select {...register('preferredLanguage')} className={selectClass}>
                      <option value="">{t.triage.select}</option>
                      <option value="SOMALI">Somali</option>
                      <option value="ENGLISH">English</option>
                      <option value="ARABIC">Arabic</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>{t.details.special}</FieldLabel>
                    <textarea
                      {...register('specialInstructions')}
                      rows={3}
                      className={`${inputClass} h-auto resize-none py-3`}
                      placeholder={t.details.specialPlaceholder}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 'review' ? (
            <>
              <SectionCard title={t.review.title} subtitle={t.review.subtitle}>
                <div className="space-y-2">
                  {reviewRows.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 text-sm">
                      <span className="font-medium text-slate-500">{row.label}</span>
                      <span className="text-right font-semibold text-slate-900">{row.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p>{t.review.consentWarning}</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-slate-200 p-5">
                <input type="checkbox" {...register('consent')} className="mt-1 h-5 w-5" />
                <span className="text-sm font-semibold text-slate-800">{t.review.consent}</span>
              </label>
            </>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-44 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t.needHelp}</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                {t.helpSecure}
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                {t.helpCall}
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                {t.helpHotline} <a href={`tel:${EMERGENCY_HOTLINE}`}>{EMERGENCY_HOTLINE}</a>
              </li>
            </ul>
          </div>
        </aside>
      </form>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <p className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 sm:block">
            {t.step} {stepIndex + 1} {t.of} {STEPS.length}
          </p>
          <div className="ml-auto flex w-full gap-3 sm:w-auto">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-slate-200 px-6 text-sm font-bold uppercase text-slate-700 transition hover:bg-slate-50 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                {t.back}
              </button>
            ) : null}

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-red-600 px-8 text-sm font-bold uppercase text-white shadow-lg shadow-red-200 transition hover:bg-red-700 sm:flex-none"
              >
                {t.continue}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  void handleSubmit(onSubmit)()
                }}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-8 text-sm font-bold uppercase text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60 sm:flex-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  t.requestAmbulance
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
