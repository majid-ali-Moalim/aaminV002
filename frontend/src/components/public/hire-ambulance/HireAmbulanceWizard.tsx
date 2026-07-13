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
  Shield,
  Siren,
  Truck,
  User,
} from 'lucide-react'
import { fetchFleetAvailability } from '@/lib/emergency/emergencyTypes'
import { fetchHireEmergencyTypes } from '@/lib/hire-ambulance/emergencyTypes'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import {
  API_BASE,
  BOOKING_TIME_SLOTS,
  DRAFT_KEY,
  EMERGENCY_HOTLINE,
  EMERGENCY_TYPE_OPTIONS,
  LANG_KEY,
  REQUEST_TYPES,
  TRANSPORT_TYPES,
} from './constants'
import {
  buildPayload,
  defaultFormValues,
  formatSomaliaPhone,
  isOtherEmergencyTypeValue,
  isOtherTransportType,
  validateEmergencyForm,
  validateNonEmergencyForm,
  type HireEmergencyTypeOption,
  type HireFormValues,
} from './formHelpers'
import { getHireT, type HireLang } from './translations'

type Region = { id: string; name: string }
type District = { id: string; name: string }
type Hospital = { id: string; name: string }

const inputClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40'
const selectClass =
  'w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40'
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2'

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
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
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
  const [emergencyTypes, setEmergencyTypes] = useState<HireEmergencyTypeOption[]>([])

  const { register, handleSubmit, watch, setValue, reset, getValues, control } = useForm<HireFormValues>({
    defaultValues: defaultFormValues,
  })

  const [requestType, regionId, districtId, emergencyType, transportType, bookingTime, conditionDescription] =
    useWatch({
      control,
      name: ['requestType', 'regionId', 'districtId', 'emergencyType', 'transportType', 'bookingTime', 'conditionDescription'],
    })

  const t = useMemo(() => getHireT(lang), [lang])
  const isEmergency = requestType === 'EMERGENCY'
  const showEmergencyTypeOther = isOtherEmergencyTypeValue(emergencyType ?? '')
  const showOtherTransport = isOtherTransportType(transportType ?? '')
  const today = new Date().toISOString().slice(0, 10)

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
      const [regionsRes, hospitalsRes, fleetInfo, emergency] = await Promise.all([
        fetch(`${API_BASE}/api/setup/regions`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/hospitals`, { cache: 'no-store' }),
        fetchFleetAvailability(),
        fetchHireEmergencyTypes(),
      ])
      if (regionsRes.ok) setRegions((await regionsRes.json()) as Region[])
      if (hospitalsRes.ok) setHospitals((await hospitalsRes.json()) as Hospital[])
      setEmergencyTypes(emergency)
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
    setValue('requestType', next)
    if (next === 'EMERGENCY') {
      setValue('transportType', '')
      setValue('transportTypeOther', '')
      setValue('bookingDate', '')
      setValue('bookingTime', '')
      setValue('bookingTimeCustom', '')
      setValue('destinationHospital', '')
      setValue('consent', false)
    } else {
      setValue('emergencyType', '')
      setValue('emergencyTypeOther', '')
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
      const validationError = isEmergency
        ? validateEmergencyForm(data, { emergencyTypes, t })
        : validateNonEmergencyForm(data, { emergencyTypes, t })
      if (validationError) {
        toast.error(validationError)
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
      <div>
        <FieldLabel required>{t.emergencyQuick.region}</FieldLabel>
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
        <FieldLabel required>{t.emergencyQuick.district}</FieldLabel>
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
        <FieldLabel required={areaRequired}>{t.emergencyQuick.areaStreet}</FieldLabel>
        <input {...register('areaName')} className={inputClass} placeholder="e.g. Hodan, Wadada Maka Al-Mukarama" />
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-32 ${PUBLIC_HEADER_OFFSET}`}>
      <section className="border-b border-slate-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <a href={`tel:${EMERGENCY_HOTLINE}`} className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700">
            <Phone className="h-4 w-4" />
            {t.emergencyHotline}: {EMERGENCY_HOTLINE}
          </a>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1">
            {(['en', 'so'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`h-8 rounded-lg px-3 text-xs font-bold uppercase ${lang === code ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 pt-8">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t.heroTitle} <span className="text-red-600">{t.heroTitleAccent}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">{t.heroSubtitle}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
            <Truck className="h-4 w-4 text-red-600" />
            <span className="font-bold text-slate-900">{fleet.available}</span>
            <span className="text-slate-500">{t.fleetAvailable}</span>
          </div>
        </div>
      </section>

      <form
        id="hire-ambulance-form"
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto w-full max-w-4xl space-y-6 px-4 py-4"
      >
        {fleetStatus !== 'available' && (
          <div className={`rounded-2xl border p-4 text-sm ${fleetStatus === 'loading' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <div className="flex items-start gap-2">
              {fleetStatus === 'loading' ? <Loader2 className="mt-0.5 h-4 w-4 animate-spin" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
              <p>{fleetStatus === 'loading' ? t.fleet.checking : `${t.fleet.unavailableDesc} ${t.fleet.callHotline} ${EMERGENCY_HOTLINE}`}</p>
            </div>
          </div>
        )}

        {/* Step 1 — Request Type */}
        <SectionCard title={t.requestType.title} subtitle={t.requestType.subtitle}>
          <div className="grid gap-4 sm:grid-cols-2">
            {REQUEST_TYPES.map((typeOption) => {
              const selected = requestType === typeOption.value
              return (
                <label
                  key={typeOption.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-5 transition ${selected ? `${typeOption.accent} ring-2` : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="requestType"
                    value={typeOption.value}
                    checked={selected}
                    onChange={() => handleRequestTypeChange(typeOption.value)}
                    className="mt-1 h-4 w-4 accent-red-600"
                  />
                  <div>
                    <p className="font-bold text-slate-900">
                      {typeOption.value === 'EMERGENCY' ? t.requestType.emergency : t.requestType.nonEmergency}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {typeOption.value === 'EMERGENCY' ? t.requestType.emergencyDesc : t.requestType.nonEmergencyDesc}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </SectionCard>

        {/* Emergency — short form only */}
        {isEmergency && (
          <SectionCard title={t.emergencyQuick.title} subtitle={t.emergencyQuick.subtitle}>
            <div className="space-y-5">
              <div>
                <FieldLabel required>{t.emergencyQuick.patientName}</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input {...register('patientName')} className={inputClass} placeholder="Full name" />
                  <button
                    type="button"
                    onClick={() => setValue('patientName', 'Unknown Patient')}
                    className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {t.unknownPatient}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel required>{t.emergencyQuick.phone}</FieldLabel>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+252</span>
                  <input
                    {...register('callerPhone')}
                    className={`${inputClass} rounded-l-none`}
                    placeholder={t.identity.phonePlaceholder}
                    onChange={(e) => setValue('callerPhone', formatSomaliaPhone(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <FieldLabel required>{t.emergencyType.label}</FieldLabel>
                <select
                  {...register('emergencyType', {
                    onChange: (e) => {
                      if (!isOtherEmergencyTypeValue(e.target.value)) setValue('emergencyTypeOther', '')
                    },
                  })}
                  className={selectClass}
                >
                  <option value="">{t.triage.select}</option>
                  {EMERGENCY_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {showEmergencyTypeOther && (
                  <div className="mt-4">
                    <FieldLabel required>{t.emergencyType.otherLabel}</FieldLabel>
                    <input {...register('emergencyTypeOther')} className={inputClass} placeholder={t.emergencyType.otherPlaceholder} />
                  </div>
                )}
              </div>

              <LocationFields />

              <div>
                <FieldLabel>{t.emergencyQuick.whatHappened}</FieldLabel>
                <p className="mb-2 text-xs text-slate-400">{t.emergencyQuick.whatHappenedHint}</p>
                <textarea
                  {...register('conditionDescription', { maxLength: 100 })}
                  rows={3}
                  maxLength={100}
                  className={`${inputClass} h-auto resize-none py-3`}
                  placeholder={t.emergencyQuick.whatHappenedPlaceholder}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{(conditionDescription ?? '').length}/100</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-bold uppercase tracking-wide text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
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
                <div className="sm:col-span-2">
                  <FieldLabel required>{t.patient.fullName}</FieldLabel>
                  <input {...register('patientName')} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>{t.identity.phone}</FieldLabel>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+252</span>
                    <input
                      {...register('callerPhone')}
                      className={`${inputClass} rounded-l-none`}
                      placeholder={t.identity.phonePlaceholder}
                      onChange={(e) => setValue('callerPhone', formatSomaliaPhone(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t.transport.title} subtitle={t.transport.subtitle}>
              <div>
                <FieldLabel required>{t.transport.typeLabel}</FieldLabel>
                <select
                  {...register('transportType', {
                    onChange: (e) => {
                      if (!isOtherTransportType(e.target.value)) setValue('transportTypeOther', '')
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
              {showOtherTransport && (
                <div className="mt-4">
                  <FieldLabel required>{t.transport.otherLabel}</FieldLabel>
                  <input {...register('transportTypeOther')} className={inputClass} placeholder={t.transport.otherPlaceholder} />
                </div>
              )}
            </SectionCard>

            <SectionCard title={t.location.pickupTitle} subtitle={t.location.pickupSubtitle}>
              <LocationFields areaRequired />
            </SectionCard>

            <SectionCard title={t.details.destinationHospital} subtitle={t.details.subtitle}>
              <FieldLabel required>{t.details.destinationHospital}</FieldLabel>
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
            </SectionCard>

            <SectionCard title={t.schedule.title} subtitle={t.schedule.subtitle}>
              <div className="grid gap-6">
                <div>
                  <FieldLabel required>{t.schedule.date}</FieldLabel>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="date" {...register('bookingDate')} min={today} className={`${inputClass} pl-11`} />
                  </div>
                </div>
                <div>
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
                        }}
                        className={`rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition ${
                          bookingTime === slot.value
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setValue('bookingTime', 'custom')}
                      className={`rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition ${
                        bookingTime === 'custom'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t.schedule.customTime}
                    </button>
                  </div>
                  {bookingTime === 'custom' && (
                    <div className="relative mt-3">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input type="time" {...register('bookingTimeCustom')} className={`${inputClass} pl-11`} />
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title={t.details.special} subtitle={t.transport.notesLabel}>
              <textarea
                {...register('specialInstructions')}
                rows={4}
                className={`${inputClass} h-auto resize-none py-3`}
                placeholder={t.details.specialPlaceholder}
              />
            </SectionCard>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-slate-200 p-5">
              <input type="checkbox" {...register('consent')} className="mt-1 h-5 w-5 accent-red-600" />
              <span className="text-sm font-semibold text-slate-800">{t.review.consent}</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-bold uppercase tracking-wide text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:opacity-60"
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
      </form>

      <aside className="mx-auto mt-8 hidden max-w-4xl px-4 lg:block">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t.needHelp}</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              {t.helpSecure}
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              {t.helpCall}
            </li>
            <li className="flex gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              {t.helpHotline} <a href={`tel:${EMERGENCY_HOTLINE}`} className="font-bold text-red-600">{EMERGENCY_HOTLINE}</a>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
