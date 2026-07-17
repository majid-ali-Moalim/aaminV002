'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  AlertOctagon,
  Building2,
  CheckCircle2,
  RefreshCw,
  Timer,
  Truck,
  Siren,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  emergencyRequestsService,
  hospitalsService,
  systemSetupService,
} from '@/lib/api'
import { District, Region } from '@/types'
import {
  fetchEmergencyTypesAuthenticated,
  type EmergencyTypeOption,
} from '@/lib/emergency/emergencyTypes'
import { buildPayloadForType } from './buildPayload'
import EmergencyDispatchFormView from './EmergencyFormView'
import type { HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import NonEmergencyDispatchFormView from './NonEmergencyFormView'
import ReferralDispatchFormView from './ReferralFormView'
import {
  defaultDraft,
  type DispatchCreateDraft,
  type DispatchFormErrors,
  type DispatchRequestType,
} from './types'
import { firstErrorMessage, validateDispatchForm } from './validation'
import {
  applySharedContactToDraft,
  extractSharedContactFromDraft,
  findBanadirRegionId,
  findBanadirRegionName,
  withBanadirRegionDefaults,
} from '@/lib/emergency/dispatchFormShared'
import { emergencyPortalPaths } from '@/lib/emergency/emergencyPortalPaths'

export type EmergencyFormContext = 'admin' | 'dispatcher'

const FORM_ROUTES: Record<
  EmergencyFormContext,
  {
    back: string
    pending: string
    viewCase: (caseId: string) => string
    portalLabel: string
  }
> = {
  admin: {
    back: '/admin/emergency-requests',
    pending: emergencyPortalPaths('admin').pending,
    viewCase: (caseId) => emergencyPortalPaths('admin').caseDetail(caseId),
    portalLabel: 'Admin',
  },
  dispatcher: {
    back: '/dispatcher/dashboard',
    pending: emergencyPortalPaths('dispatcher').pending,
    viewCase: (caseId) => emergencyPortalPaths('dispatcher').caseDetail(caseId),
    portalLabel: 'Dispatcher',
  },
}

const REQUEST_TYPE_CARDS: {
  id: DispatchRequestType
  title: string
  description: string
  icon: typeof Siren
  accent: string
  ring: string
}[] = [
  {
    id: 'EMERGENCY',
    title: 'Emergency',
    description: 'Life-threatening emergencies requiring immediate ambulance dispatch.',
    icon: Siren,
    accent: 'border-red-500 bg-red-50 ring-red-500',
    ring: 'ring-red-500/20',
  },
  {
    id: 'NON_EMERGENCY',
    title: 'Non-Emergency',
    description: 'Scheduled or non-urgent medical transportation.',
    icon: Truck,
    accent: 'border-blue-500 bg-blue-50 ring-blue-500',
    ring: 'ring-blue-500/20',
  },
  {
    id: 'REFERRAL',
    title: 'Referral',
    description: 'Transfer a patient from one healthcare facility to another.',
    icon: Building2,
    accent: 'border-emerald-500 bg-emerald-50 ring-emerald-500',
    ring: 'ring-emerald-500/20',
  },
]

export default function DispatchRequestCreator({
  context = 'admin',
  operatorName,
  returnPath,
}: {
  context?: EmergencyFormContext
  operatorName?: string
  returnPath?: string
}) {
  const router = useRouter()
  const { user } = useAuth()
  const routes = FORM_ROUTES[context]
  const backPath = returnPath ?? routes.back
  const displayName = operatorName || user?.username || routes.portalLabel

  const [draft, setDraft] = useState<DispatchCreateDraft>(() => defaultDraft())
  const [errors, setErrors] = useState<DispatchFormErrors>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successCode, setSuccessCode] = useState<string | null>(null)
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null)
  const [routingInfo, setRoutingInfo] = useState<{
    stationName?: string | null
    crossStationRoute?: boolean
    submitterCanAccess?: boolean
  } | null>(null)
  const [sessionStart] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState('00:00:00')

  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [hospitals, setHospitals] = useState<HospitalOption[]>([])
  const [emergencyTypes, setEmergencyTypes] = useState<EmergencyTypeOption[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [activeRegionId, setActiveRegionId] = useState('')

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

  useEffect(() => {
    const load = async () => {
      try {
        const [regionsRes, types, hospitalsRes] = await Promise.all([
          systemSetupService.getRegions(),
          fetchEmergencyTypesAuthenticated(),
          hospitalsService.getAll(),
        ])
        setRegions(Array.isArray(regionsRes) ? regionsRes : [])
        setEmergencyTypes(types)
        setHospitals(
          Array.isArray(hospitalsRes)
            ? hospitalsRes
                .filter((h: { acceptEmergencyCases?: boolean; isActive?: boolean }) => h.acceptEmergencyCases !== false && h.isActive !== false)
                .map((h: { id: string; name: string; branches?: unknown }) => ({
                  id: h.id,
                  name: h.name,
                  branches: h.branches,
                }))
            : [],
        )

        const regionList = Array.isArray(regionsRes) ? regionsRes : []
        const banadirId = findBanadirRegionId(regionList)
        if (banadirId) {
          setActiveRegionId(banadirId)
          setDraft((prev) => withBanadirRegionDefaults(prev, banadirId))
        }
      } catch {
        toast.error('Failed to load form resources')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const loadDistricts = useCallback(async (regionId: string) => {
    if (!regionId) {
      setDistricts([])
      return
    }
    setLoadingDistricts(true)
    try {
      const rows = await systemSetupService.getDistricts(regionId)
      setDistricts(Array.isArray(rows) ? rows : [])
    } catch {
      setDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }, [])

  useEffect(() => {
    if (activeRegionId) void loadDistricts(activeRegionId)
  }, [activeRegionId, loadDistricts])

  const selectRequestType = (type: DispatchRequestType) => {
    setDraft((prev) => {
      const shared = extractSharedContactFromDraft(prev)
      let next: DispatchCreateDraft = { ...prev, requestType: type }
      if (shared.patientName.trim() || shared.phone.trim()) {
        next = applySharedContactToDraft(next, shared, type)
      }
      return next
    })
    setErrors({})
  }

  const patchEmergency = (patch: Partial<DispatchCreateDraft['emergency']>) => {
    setDraft((prev) => ({ ...prev, emergency: { ...prev.emergency, ...patch } }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const patchNonEmergency = (patch: Partial<DispatchCreateDraft['nonEmergency']>) => {
    setDraft((prev) => ({ ...prev, nonEmergency: { ...prev.nonEmergency, ...patch } }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const patchReferral = (patch: Partial<DispatchCreateDraft['referral']>) => {
    setDraft((prev) => ({ ...prev, referral: { ...prev.referral, ...patch } }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const handleCancel = () => {
    if (window.confirm('Discard this request and go back?')) {
      router.push(backPath)
    }
  }

  const handleSubmit = async () => {
    if (!draft.requestType) {
      toast.error('Select a request type first')
      return
    }
    const validationErrors = validateDispatchForm(draft.requestType, draft, emergencyTypes)
    setErrors(validationErrors)
    const msg = firstErrorMessage(validationErrors)
    if (msg) {
      toast.error(msg)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...buildPayloadForType(draft.requestType, draft, emergencyTypes),
        ...(user?.id ? { createdByUserId: user.id } : {}),
        ...(user?.employee?.id ? { submitterEmployeeId: user.employee.id } : {}),
      }
      const result = await emergencyRequestsService.create(payload)
      const code = result?.trackingCode || result?.id
      const routing = result?.routing ?? {}
      setRoutingInfo(routing)
      setSuccessCode(code)
      setCreatedCaseId(result?.id || null)

      const stationLabel = routing.stationName || 'the responsible station'
      if (routing.crossStationRoute) {
        toast.success(
          `Emergency request created successfully and routed to ${stationLabel} for review.`,
        )
      } else {
        toast.success(
          routing.stationName
            ? `Emergency request created successfully and routed to ${stationLabel} for review.`
            : `Case ${code} created successfully`,
        )
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const msg = err?.response?.data?.message || err?.message || 'Failed to create case'
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const banadirRegionName = findBanadirRegionName(regions)

  const submitterCanViewCase =
    context === 'admin' || routingInfo?.submitterCanAccess !== false

  useEffect(() => {
    if (!successCode || !createdCaseId || context !== 'dispatcher') return
    if (!routingInfo?.submitterCanAccess) return
    const timer = window.setTimeout(() => {
      router.push(routes.viewCase(createdCaseId))
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [successCode, createdCaseId, routingInfo, context, router, routes])

  if (successCode) {
    const stationLabel = routingInfo?.stationName || 'the responsible station'
    const crossStation = Boolean(routingInfo?.crossStationRoute)

    return (
      <div className="fixed inset-0 z-[100] bg-[#0F172A] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-10 text-center text-white">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Request Created</h1>
            <p className="text-red-100 text-sm mt-2">
              {crossStation
                ? `Routed to ${stationLabel} for review`
                : `Registered in Aamin Emergency Dispatch`}
            </p>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6 px-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Case Reference</p>
              <p className="text-3xl font-black text-red-600 font-mono tracking-wide">{successCode}</p>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Emergency request created successfully and routed to{' '}
                <span className="font-bold text-slate-900">{stationLabel}</span> for review.
              </p>
            </div>

            {crossStation ? (
              <p className="text-sm text-slate-600 leading-relaxed">
                This case belongs to another station. Dispatchers at{' '}
                <span className="font-semibold text-slate-900">{stationLabel}</span> will receive it in
                their pending queue immediately.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                Opening the case for review…
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {submitterCanViewCase && createdCaseId ? (
                <Link
                  href={routes.viewCase(createdCaseId)}
                  className="flex-1 min-h-12 px-4 flex items-center justify-center rounded-xl bg-[#0F172A] text-white text-sm font-bold uppercase tracking-wide hover:bg-slate-800 whitespace-nowrap"
                >
                  Review Case
                </Link>
              ) : null}
              {crossStation || !submitterCanViewCase ? (
                <Link
                  href={routes.back}
                  className={`${submitterCanViewCase && createdCaseId ? 'flex-1' : 'w-full'} min-h-12 px-4 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-wide hover:bg-slate-50 whitespace-nowrap`}
                >
                  Back to Dashboard
                </Link>
              ) : (
                <Link
                  href={routes.pending}
                  className="flex-1 min-h-12 px-4 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-wide hover:bg-slate-50 whitespace-nowrap"
                >
                  Pending Queue
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#EEF1F5] flex flex-col overflow-hidden">
      <header className="shrink-0 bg-gradient-to-r from-[#B71C1C] via-[#C62828] to-[#D32F2F] text-white shadow-lg">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backPath)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-wide">Create Request</h1>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-red-100 font-medium uppercase tracking-widest mt-0.5">
                Aamin Emergency Dispatch · {displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full font-mono text-lg font-black">
            <Timer className="w-4 h-4" />
            {elapsed}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 pb-32">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading dispatch resources…</p>
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  Step 1 — Select Request Type
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {REQUEST_TYPE_CARDS.map((card) => {
                    const Icon = card.icon
                    const selected = draft.requestType === card.id
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => selectRequestType(card.id)}
                        className={`text-left rounded-2xl border-2 p-5 transition-all ${
                          selected
                            ? `${card.accent} ring-2 ${card.ring} shadow-md scale-[1.01]`
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                            card.id === 'EMERGENCY'
                              ? 'bg-red-100 text-red-600'
                              : card.id === 'NON_EMERGENCY'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <p className="text-lg font-black text-slate-900">{card.title}</p>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{card.description}</p>
                      </button>
                    )
                  })}
                </div>
                {errors.requestType && (
                  <p className="text-sm font-bold text-red-600 mt-2">{errors.requestType}</p>
                )}
              </section>

              {draft.requestType === 'EMERGENCY' && (
                <EmergencyDispatchFormView
                  form={draft.emergency}
                  errors={errors}
                  banadirRegionName={banadirRegionName}
                  districts={districts}
                  emergencyTypes={emergencyTypes}
                  loadingDistricts={loadingDistricts}
                  onChange={patchEmergency}
                  onCancel={handleCancel}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {draft.requestType === 'NON_EMERGENCY' && (
                <NonEmergencyDispatchFormView
                  form={draft.nonEmergency}
                  errors={errors}
                  banadirRegionName={banadirRegionName}
                  districts={districts}
                  hospitals={hospitals}
                  loadingDistricts={loadingDistricts}
                  onChange={patchNonEmergency}
                  onCancel={handleCancel}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {draft.requestType === 'REFERRAL' && (
                <ReferralDispatchFormView
                  form={draft.referral}
                  errors={errors}
                  banadirRegionName={banadirRegionName}
                  districts={districts}
                  hospitals={hospitals}
                  loadingDistricts={loadingDistricts}
                  onChange={patchReferral}
                  onCancel={handleCancel}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {!draft.requestType && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                  <AlertOctagon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-600">Select a request type to continue</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Each form is tailored for faster, more accurate dispatch entry.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
