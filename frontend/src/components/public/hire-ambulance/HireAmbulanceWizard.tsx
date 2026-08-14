'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Siren,
} from 'lucide-react'
import { fetchFleetAvailability } from '@/lib/emergency/emergencyTypes'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import {
  API_BASE,
  BOOKING_TIME_SLOTS,
  DRAFT_KEY,
  EMERGENCY_HOTLINE,
  LANG_KEY,
  REQUEST_TYPES,
  TRANSPORT_TYPES,
} from './constants'
import {
  buildPayload,
  defaultFormValues,
  formatSomaliaPhone,
  isOtherTransportType,
  validateEmergencyFormFields,
  validateNonEmergencyFormFields,
  type HireFormErrors,
  type HireFormValues,
} from './formHelpers'
import { getHireT, type HireLang } from './translations'

type Region = { id: string; name: string }
type District = { id: string; name: string }
type Hospital = { id: string; name: string }

const inputClass =
  'w-full h-11 sm:h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40'
const selectClass =
  'w-full h-11 sm:h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

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
  compact,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm">
      <div className={compact ? 'mb-4' : 'mb-5'}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs font-semibold text-red-600">{message}</p>
}

function fieldClass(base: string, hasError: boolean) {
  return hasError ? `${base} border-red-400 ring-2 ring-red-100` : base
}

export default function HireAmbulanceWizard() {
  const router = useRouter()
  const submitLockRef = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lang, setLang] = useState<HireLang>('en')
  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [fleet, setFleet] = useState({ available: 0, total: 0 })
  const [fleetStatus, setFleetStatus] = useState<'loading' | 'available' | 'unavailable'>('loading')
  const [formErrors, setFormErrors] = useState<HireFormErrors>({})

  const { register, handleSubmit, watch, setValue, reset, getValues, control } = useForm<HireFormValues>({
    defaultValues: defaultFormValues,
  })

  const [requestType, regionId, districtId, transportType, bookingTime, conditionDescription, scheduleMode] =
    useWatch({
      control,
      name: ['requestType', 'regionId', 'districtId', 'transportType', 'bookingTime', 'conditionDescription', 'scheduleMode'],
    })

  const t = useMemo(() => getHireT(lang), [lang])
  const isEmergency = requestType === 'EMERGENCY'
  const showOtherTransport = isOtherTransportType(transportType ?? '')
  const today = new Date().toISOString().slice(0, 10)

  const clearError = (field: keyof HireFormValues) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const runValidation = (data: HireFormValues): HireFormErrors => {
    const ctx = { t }
    return data.requestType === 'EMERGENCY'
      ? validateEmergencyFormFields(data, ctx)
      : validateNonEmergencyFormFields(data, ctx)
  }

  const setLanguage = useCallback((next: HireLang) => {
    setLang(next)
    try {
      sessionStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const loadPublicData = useCallback(async () => {
    setFleetStatus((prev) => (prev === 'available' ? prev : 'loading'))
    try {
      const [regionsRes, hospitalsRes, fleetInfo] = await Promise.all([
        fetch(`${API_BASE}/api/setup/regions`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/hospitals`, { cache: 'no-store' }),
        fetchFleetAvailability(),
      ])
      if (regionsRes.ok) setRegions((await regionsRes.json()) as Region[])
      if (hospitalsRes.ok) setHospitals((await hospitalsRes.json()) as Hospital[])
      if (fleetInfo) {
        setFleet({ available: fleetInfo.available, total: fleetInfo.total })
        setFleetStatus(fleetInfo.canAcceptRequests ? 'available' : 'unavailable')
      } else {
        setFleet({ available: 0, total: 0 })
        setFleetStatus('unavailable')
      }
    } catch {
      setFleet({ available: 0, total: 0 })
      setFleetStatus('unavailable')
    }
  }, [])

  useEffect(() => {
    try {
      const savedLang = sessionStorage.getItem(LANG_KEY)
      if (savedLang === 'en' || savedLang === 'so') setLang(savedLang)
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as { form?: Partial<HireFormValues>; lang?: HireLang }
      if (draft.form) reset({ ...defaultFormValues, ...draft.form })
      if (draft.lang === 'en' || draft.lang === 'so') setLang(draft.lang)
    } catch {
      /* ignore */
    }
  }, [reset])

  useEffect(() => {
    void loadPublicData()
    const timer = setInterval(() => void loadPublicData(), 60000)
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
        const response = await fetch(`${API_BASE}/api/setup/districts?regionId=${regionId}`, { cache: 'no-store' })
        if (!response.ok) {
          setDistricts([])
          setValue('districtId', '')
          return
        }
        const rows = (await response.json()) as District[]
        setDistricts(rows)
        if (districtId && !rows.some((item) => item.id === districtId)) setValue('districtId', '')
      } catch {
        setDistricts([])
        setValue('districtId', '')
      }
    }
    void loadDistricts()
  }, [districtId, regionId, setValue])

  useEffect(() => {
    const subscription = watch(() => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form: getValues(), lang }))
        } catch {
          /* ignore */
        }
      }, 2000)
    })
    return () => {
      subscription.unsubscribe()
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [getValues, lang, watch])

  const handleRequestTypeChange = (next: string) => {
    setFormErrors({})
    setValue('requestType', next)
    if (next === 'EMERGENCY') {
      setValue('transportType', '')
      setValue('transportTypeOther', '')
      setValue('bookingDate', '')
      setValue('bookingTime', '')
      setValue('bookingTimeCustom', '')
      setValue('scheduleMode', 'now')
      setValue('destinationHospital', '')
      setValue('consent', false)
    } else {
      setValue('scheduleMode', 'now')
    }
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
      const errors = runValidation(data)
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        const firstKey = Object.keys(errors)[0]
        toast.error(errors[firstKey as keyof HireFormValues] ?? t.validation.requestType)
        document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      setFormErrors({})
      const response = await fetch(`${API_BASE}/api/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(data)),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.message || t.errors.submitFailed)
      }
      const result = (await response.json()) as { trackingCode?: string }
      sessionStorage.removeItem(DRAFT_KEY)
      router.push(
        `/hire-ambulance/success?code=${encodeURIComponent(result.trackingCode || '')}&at=${encodeURIComponent(new Date().toISOString())}&lang=${encodeURIComponent(lang)}`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errors.submitFailed)
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  const LocationFields = ({ areaRequired = false }: { areaRequired?: boolean }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div data-field="regionId">
        <FieldLabel required>{t.emergencyQuick.region}</FieldLabel>
        <select
          {...register('regionId', { onChange: () => clearError('regionId') })}
          className={fieldClass(selectClass, !!formErrors.regionId)}
        >
          <option value="">{t.location.selectRegion}</option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
        <FieldError message={formErrors.regionId} />
      </div>
      <div data-field="districtId">
        <FieldLabel required>{t.emergencyQuick.district}</FieldLabel>
        <select
          {...register('districtId', { onChange: () => clearError('districtId') })}
          disabled={!regionId}
          className={fieldClass(`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`, !!formErrors.districtId)}
        >
          <option value="">{t.location.selectDistrict}</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
        <FieldError message={formErrors.districtId} />
      </div>
      <div className="sm:col-span-2" data-field="areaName">
        <FieldLabel required={areaRequired}>{t.emergencyQuick.areaStreet}</FieldLabel>
        <input
          {...register('areaName', { onChange: () => clearError('areaName') })}
          className={fieldClass(inputClass, !!formErrors.areaName)}
          placeholder="e.g. Hodan, Wadada Maka Al-Mukarama"
        />
        <FieldError message={formErrors.areaName} />
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-16 ${PUBLIC_HEADER_OFFSET}`}>
      <section className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
          <a
            href={`tel:${EMERGENCY_HOTLINE}`}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 sm:flex-none sm:justify-start"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span>{t.callEmergency} {EMERGENCY_HOTLINE}</span>
          </a>
          <div className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-1">
            {(['en', 'so'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`h-9 min-w-[2.5rem] rounded-lg px-3 text-xs font-semibold uppercase transition ${
                  lang === code
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </section>

      <form
        id="hire-ambulance-form"
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-xl space-y-4 px-4 py-5 sm:py-6"
      >
        {fleetStatus !== 'available' && (
          <div className={`rounded-2xl border p-4 text-sm ${fleetStatus === 'loading' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <div className="flex items-start gap-2">
              {fleetStatus === 'loading' ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
              <p>{fleetStatus === 'loading' ? t.fleet.checking : `${t.fleet.unavailableDesc} ${t.fleet.callHotline} ${EMERGENCY_HOTLINE}`}</p>
            </div>
          </div>
        )}

        {/* Request Type — compact toggle */}
        <div data-field="requestType">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t.requestType.title}</p>
          <div className="grid grid-cols-2 gap-2">
            {REQUEST_TYPES.map((typeOption) => {
              const selected = requestType === typeOption.value
              const isEmergencyOption = typeOption.value === 'EMERGENCY'
              return (
                <button
                  key={typeOption.value}
                  type="button"
                  onClick={() => handleRequestTypeChange(typeOption.value)}
                  className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition ${
                    selected
                      ? isEmergencyOption
                        ? 'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-100'
                        : 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
                  } ${formErrors.requestType && !selected ? 'border-red-300' : ''}`}
                >
                  <span className="text-xl leading-none">{isEmergencyOption ? '🚨' : '🚑'}</span>
                  <span className="text-sm font-semibold">
                    {isEmergencyOption ? t.requestType.emergency : t.requestType.nonEmergency}
                  </span>
                </button>
              )
            })}
          </div>
          <FieldError message={formErrors.requestType} />
        </div>

        {/* Emergency — short form only */}
        {isEmergency && (
          <SectionCard title={t.emergencyQuick.title} subtitle={t.emergencyQuick.subtitle} compact>
            <div className="space-y-5">
              <div data-field="patientName">
                <FieldLabel required>{t.emergencyQuick.patientName}</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    {...register('patientName', { onChange: () => clearError('patientName') })}
                    className={fieldClass(inputClass, !!formErrors.patientName)}
                    placeholder="Full name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue('patientName', 'Unknown Patient')
                      clearError('patientName')
                    }}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t.unknownPatient}
                  </button>
                </div>
                <FieldError message={formErrors.patientName} />
              </div>

              <div data-field="callerPhone">
                <FieldLabel required>{t.emergencyQuick.phone}</FieldLabel>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+252</span>
                  <input
                    {...register('callerPhone')}
                    className={fieldClass(`${inputClass} rounded-l-none`, !!formErrors.callerPhone)}
                    placeholder={t.identity.phonePlaceholder}
                    onChange={(e) => {
                      setValue('callerPhone', formatSomaliaPhone(e.target.value))
                      clearError('callerPhone')
                    }}
                  />
                </div>
                <FieldError message={formErrors.callerPhone} />
              </div>

              <LocationFields areaRequired />

              <div data-field="conditionDescription">
                <FieldLabel required>{t.emergencyQuick.briefDescription}</FieldLabel>
                <p className="mb-2 text-xs text-slate-400">{t.emergencyQuick.briefDescriptionHint}</p>
                <textarea
                  {...register('conditionDescription', {
                    maxLength: 100,
                    onChange: () => clearError('conditionDescription'),
                  })}
                  rows={3}
                  maxLength={100}
                  className={fieldClass(`${inputClass} h-auto resize-none py-3`, !!formErrors.conditionDescription)}
                  placeholder={t.emergencyQuick.briefDescriptionPlaceholder}
                />
                <div className="mt-1 flex items-center justify-between">
                  <FieldError message={formErrors.conditionDescription} />
                  <span className="text-xs text-slate-400 ml-auto">{(conditionDescription ?? '').length}/100</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  <>
                    <Siren className="h-5 w-5" />
                    {t.requestEmergencyAmbulance}
                  </>
                )}
              </button>
            </div>
          </SectionCard>
        )}

        {/* Non-Emergency — complete booking form */}
        {!isEmergency && requestType === 'NON_EMERGENCY' && (
          <>
            <SectionCard title={t.patient.title} subtitle={t.patient.subtitle}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2" data-field="patientName">
                  <FieldLabel required>{t.patient.fullName}</FieldLabel>
                  <input
                    {...register('patientName', { onChange: () => clearError('patientName') })}
                    className={fieldClass(inputClass, !!formErrors.patientName)}
                  />
                  <FieldError message={formErrors.patientName} />
                </div>
                <div className="sm:col-span-2" data-field="callerPhone">
                  <FieldLabel required>{t.identity.phone}</FieldLabel>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+252</span>
                    <input
                      {...register('callerPhone')}
                      className={fieldClass(`${inputClass} rounded-l-none`, !!formErrors.callerPhone)}
                      placeholder={t.identity.phonePlaceholder}
                      onChange={(e) => {
                        setValue('callerPhone', formatSomaliaPhone(e.target.value))
                        clearError('callerPhone')
                      }}
                    />
                  </div>
                  <FieldError message={formErrors.callerPhone} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t.transport.title} subtitle={t.transport.subtitle}>
              <div data-field="transportType">
                <FieldLabel required>{t.transport.typeLabel}</FieldLabel>
                <select
                  {...register('transportType', {
                    onChange: (e) => {
                      if (!isOtherTransportType(e.target.value)) setValue('transportTypeOther', '')
                      clearError('transportType')
                      clearError('transportTypeOther')
                    },
                  })}
                  className={fieldClass(selectClass, !!formErrors.transportType)}
                >
                  <option value="">{t.triage.select}</option>
                  {TRANSPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t.transportTypes[type.value]}
                    </option>
                  ))}
                </select>
                <FieldError message={formErrors.transportType} />
              </div>
              {showOtherTransport && (
                <div className="mt-4" data-field="transportTypeOther">
                  <FieldLabel required>{t.transport.otherLabel}</FieldLabel>
                  <input
                    {...register('transportTypeOther', { onChange: () => clearError('transportTypeOther') })}
                    className={fieldClass(inputClass, !!formErrors.transportTypeOther)}
                    placeholder={t.transport.otherPlaceholder}
                  />
                  <FieldError message={formErrors.transportTypeOther} />
                </div>
              )}
            </SectionCard>

            <SectionCard title={t.location.pickupTitle} subtitle={t.location.pickupSubtitle}>
              <LocationFields areaRequired />
            </SectionCard>

            <SectionCard title={t.details.destinationHospital} subtitle={t.details.subtitle}>
              <div data-field="destinationHospital">
                <FieldLabel required>{t.details.destinationHospital}</FieldLabel>
                <input
                  list="hire-hospital-list"
                  {...register('destinationHospital', { onChange: () => clearError('destinationHospital') })}
                  className={fieldClass(inputClass, !!formErrors.destinationHospital)}
                  placeholder={t.details.destinationHospitalPlaceholder}
                />
                <datalist id="hire-hospital-list">
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.name} />
                  ))}
                </datalist>
                <FieldError message={formErrors.destinationHospital} />
              </div>
            </SectionCard>

            <SectionCard title={t.schedule.title} subtitle={t.schedule.subtitle}>
              <div className="grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2" data-field="scheduleMode">
                  {(['now', 'booking'] as const).map((mode) => {
                    const selected = scheduleMode === mode
                    const isNowMode = mode === 'now'
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setValue('scheduleMode', mode)
                          clearError('scheduleMode')
                          clearError('bookingDate')
                          clearError('bookingTime')
                          clearError('bookingTimeCustom')
                          if (mode === 'now') {
                            setValue('bookingDate', '')
                            setValue('bookingTime', '')
                            setValue('bookingTimeCustom', '')
                          }
                        }}
                        className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-5 text-left transition ${
                          selected
                            ? isNowMode
                              ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
                              : 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white ${
                            isNowMode ? 'bg-red-600' : 'bg-blue-600'
                          }`}
                        >
                          {isNowMode ? t.schedule.nowBadge : t.schedule.bookingBadge}
                        </span>
                        <p className="text-sm font-semibold text-slate-700">
                          {isNowMode ? t.schedule.nowHint : t.schedule.bookingHint}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {scheduleMode === 'booking' && (
                  <>
                    <div data-field="bookingDate">
                      <FieldLabel required>{t.schedule.date}</FieldLabel>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          {...register('bookingDate', { onChange: () => clearError('bookingDate') })}
                          min={today}
                          className={fieldClass(`${inputClass} pl-11`, !!formErrors.bookingDate)}
                        />
                      </div>
                      <FieldError message={formErrors.bookingDate} />
                    </div>
                    <div data-field="bookingTime">
                      <FieldLabel required>{t.schedule.time}</FieldLabel>
                      <p className="mb-3 text-xs text-slate-400">{t.schedule.timeHint}</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {BOOKING_TIME_SLOTS.map((slot) => (
                          <button
                            key={slot.value}
                            type="button"
                            onClick={() => {
                              setValue('bookingTime', slot.value)
                              setValue('bookingTimeCustom', '')
                              clearError('bookingTime')
                              clearError('bookingTimeCustom')
                            }}
                            className={`rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition ${
                              bookingTime === slot.value
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : formErrors.bookingTime
                                  ? 'border-red-200 text-slate-600 hover:border-red-300'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setValue('bookingTime', 'custom')
                            clearError('bookingTime')
                          }}
                          className={`rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition ${
                            bookingTime === 'custom'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : formErrors.bookingTime
                                ? 'border-red-200 text-slate-600 hover:border-red-300'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {t.schedule.customTime}
                        </button>
                      </div>
                      <FieldError message={formErrors.bookingTime} />
                      {bookingTime === 'custom' && (
                        <div className="relative mt-3" data-field="bookingTimeCustom">
                          <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="time"
                            {...register('bookingTimeCustom', { onChange: () => clearError('bookingTimeCustom') })}
                            className={fieldClass(`${inputClass} pl-11`, !!formErrors.bookingTimeCustom)}
                          />
                          <FieldError message={formErrors.bookingTimeCustom} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t.details.special} subtitle={t.transport.notesLabel}>
              <div data-field="specialInstructions">
                <textarea
                  {...register('specialInstructions', { onChange: () => clearError('specialInstructions') })}
                  rows={4}
                  className={fieldClass(`${inputClass} h-auto resize-none py-3`, !!formErrors.specialInstructions)}
                  placeholder={t.details.specialPlaceholder}
                />
                <FieldError message={formErrors.specialInstructions} />
              </div>
            </SectionCard>

            <label
              data-field="consent"
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-5 ${
                formErrors.consent ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            >
              <input
                type="checkbox"
                {...register('consent', { onChange: () => clearError('consent') })}
                className="mt-1 h-5 w-5 accent-red-600"
              />
              <span className="text-sm font-semibold text-slate-800">{t.review.consent}</span>
            </label>
            <FieldError message={formErrors.consent} />

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5" />
                  {t.bookAmbulance}
                </>
              )}
            </button>
          </>
        )}

        <p className="pt-2 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t.helpCall}{' '}
          <a href={`tel:${EMERGENCY_HOTLINE}`} className="font-semibold text-red-600 hover:underline">
            {EMERGENCY_HOTLINE}
          </a>
        </p>
      </form>
    </div>
  )
}
