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

const DRAFT_KEY = 'aamin-dispatch-create-draft'

export type EmergencyFormContext = 'admin' | 'dispatcher'

const FORM_ROUTES: Record<
  EmergencyFormContext,
  {
    back: string
    pending: string
    viewCase: (caseId: string, trackingCode: string) => string
    portalLabel: string
  }
> = {
  admin: {
    back: '/admin/emergency-requests',
    pending: '/admin/emergency-requests/pending',
    viewCase: (caseId) => `/admin/emergency-requests/track/${caseId}`,
    portalLabel: 'Admin',
  },
  dispatcher: {
    back: '/dispatcher/dashboard',
    pending: '/dispatcher/emergency/pending',
    viewCase: (_caseId, trackingCode) =>
      trackingCode ? `/track/${encodeURIComponent(trackingCode)}` : '/dispatcher/emergency/pending',
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
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) setDraft({ ...defaultDraft(), ...JSON.parse(raw) })
    } catch {
      /* ignore */
    }
  }, [])

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

  const persistDraft = (next: DispatchCreateDraft) => {
    setDraft(next)
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const selectRequestType = (type: DispatchRequestType) => {
    persistDraft({ ...draft, requestType: type })
    setErrors({})
  }

  const patchEmergency = (patch: Partial<DispatchCreateDraft['emergency']>) => {
    persistDraft({ ...draft, emergency: { ...draft.emergency, ...patch } })
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const patchNonEmergency = (patch: Partial<DispatchCreateDraft['nonEmergency']>) => {
    persistDraft({ ...draft, nonEmergency: { ...draft.nonEmergency, ...patch } })
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const patchReferral = (patch: Partial<DispatchCreateDraft['referral']>) => {
    persistDraft({ ...draft, referral: { ...draft.referral, ...patch } })
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  const handleRegionChange = (regionId: string, form: 'emergency' | 'nonEmergency' | 'referral') => {
    setActiveRegionId(regionId)
    if (form === 'emergency') patchEmergency({ regionId, districtId: '' })
    if (form === 'nonEmergency') patchNonEmergency({ regionId, districtId: '' })
    if (form === 'referral') patchReferral({ regionId, districtId: '' })
  }

  const handleSaveDraft = () => {
    persistDraft(draft)
    toast.success('Draft saved locally')
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
    const validationErrors = validateDispatchForm(draft.requestType, draft)
    setErrors(validationErrors)
    const msg = firstErrorMessage(validationErrors)
    if (msg) {
      toast.error(msg)
      return
    }

    setSubmitting(true)
    try {
      const payload = buildPayloadForType(draft.requestType, draft, emergencyTypes)
      const result = await emergencyRequestsService.create(payload)
      const code = result?.trackingCode || result?.id
      setSuccessCode(code)
      setCreatedCaseId(result?.id || null)
      sessionStorage.removeItem(DRAFT_KEY)
      toast.success(`Case ${code} created successfully`)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const msg = err?.response?.data?.message || err?.message || 'Failed to create case'
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg))
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
            <h1 className="text-2xl font-black uppercase tracking-tight">Request Created</h1>
            <p className="text-red-100 text-sm mt-2">Registered in Aamin Emergency Dispatch</p>
          </div>
          <div className="p-8 text-center space-y-6">
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tracking Code</p>
              <p className="text-3xl font-black text-red-600 font-mono tracking-wide">{successCode}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={
                  createdCaseId ? routes.viewCase(createdCaseId, successCode) : routes.pending
                }
                className="flex-1 h-12 flex items-center justify-center rounded-xl bg-[#0F172A] text-white text-sm font-bold uppercase tracking-wide hover:bg-slate-800"
              >
                View Case
              </Link>
              <Link
                href={routes.pending}
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
                  regions={regions}
                  districts={districts}
                  emergencyTypes={emergencyTypes}
                  hospitals={hospitals}
                  loadingDistricts={loadingDistricts}
                  onChange={patchEmergency}
                  onRegionChange={(id) => handleRegionChange(id, 'emergency')}
                  onCancel={handleCancel}
                  onSaveDraft={handleSaveDraft}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {draft.requestType === 'NON_EMERGENCY' && (
                <NonEmergencyDispatchFormView
                  form={draft.nonEmergency}
                  errors={errors}
                  regions={regions}
                  districts={districts}
                  hospitals={hospitals}
                  loadingDistricts={loadingDistricts}
                  onChange={patchNonEmergency}
                  onRegionChange={(id) => handleRegionChange(id, 'nonEmergency')}
                  onCancel={handleCancel}
                  onSaveDraft={handleSaveDraft}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {draft.requestType === 'REFERRAL' && (
                <ReferralDispatchFormView
                  form={draft.referral}
                  errors={errors}
                  regions={regions}
                  districts={districts}
                  hospitals={hospitals}
                  loadingDistricts={loadingDistricts}
                  onChange={patchReferral}
                  onRegionChange={(id) => handleRegionChange(id, 'referral')}
                  onCancel={handleCancel}
                  onSaveDraft={handleSaveDraft}
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
