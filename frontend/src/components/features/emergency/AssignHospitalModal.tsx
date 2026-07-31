'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  GitBranch,
  Loader2,
  MapPin,
  PenLine,
  Phone,
  Search,
  Stethoscope,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { hospitalCoordinationService, getApiErrorMessage } from '@/lib/api'
import { getCachedDistricts, getCachedRegions, loadLocationReferenceData } from '@/lib/cache/referenceData'
import {
  parseHospitalBranches,
  REFUSAL_REASONS,
  refusalReasonLabel,
  type HospitalBranchRecord,
} from '@/lib/hospital-coordination/constants'
import {
  EMPTY_MANUAL_ASSIGN_HOSPITAL,
  firstManualAssignHospitalError,
  hasManualAssignHospitalErrors,
  MANUAL_HOSPITAL_TYPES,
  validateManualAssignHospitalForm,
  type ManualAssignHospitalForm,
  type ManualAssignHospitalFieldErrors,
} from '@/lib/hospital-coordination/manualAssignHospitalValidation'
import { EmergencyRequest } from '@/types'

interface AssignHospitalModalProps {
  request: EmergencyRequest
  onClose: () => void
  onSuccess: () => void
}

type AssignMode = 'registry' | 'manual'

type CoordinationHistoryItem = {
  id: string
  hospitalId: string
  hospitalName: string
  stage: string
  status: string
  refusalReason?: string | null
  refusalNotes?: string | null
  updatedAt: string
}

type HospitalRow = {
  id: string
  name: string
  hospitalCode?: string | null
  hospitalType?: string | null
  address?: string | null
  primaryPhone?: string | null
  secondaryPhone?: string | null
  emergencyShortCode?: string | null
  emergencyHotline?: string | null
  email?: string | null
  availabilityStatus?: string | null
  medicalCapabilities?: unknown
  branches?: unknown
  region?: { id: string; name: string } | null
  district?: { id: string; name: string } | null
  isActive?: boolean
}

function parseCapabilities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item) => typeof item === 'string' && item.trim().length > 0) as string[]
}

export default function AssignHospitalModal({ request, onClose, onSuccess }: AssignHospitalModalProps) {
  const [mode, setMode] = useState<AssignMode>('registry')
  const [hospitals, setHospitals] = useState<HospitalRow[]>([])
  const [history, setHistory] = useState<CoordinationHistoryItem[]>([])
  const [regions, setRegions] = useState<any[]>(() => getCachedRegions() ?? [])
  const [districts, setDistricts] = useState<any[]>(() => getCachedDistricts() ?? [])
  const [search, setSearch] = useState('')
  const [regionId, setRegionId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [manualForm, setManualForm] = useState<ManualAssignHospitalForm>({ ...EMPTY_MANUAL_ASSIGN_HOSPITAL })
  const [manualErrors, setManualErrors] = useState<ManualAssignHospitalFieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === selectedHospitalId) ?? null,
    [hospitals, selectedHospitalId],
  )

  const branches = useMemo(
    () => (selectedHospital ? parseHospitalBranches(selectedHospital.branches) : []),
    [selectedHospital],
  )

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  )

  const historyByHospital = useMemo(() => {
    const map = new Map<string, CoordinationHistoryItem>()
    for (const item of history) {
      map.set(item.hospitalId, item)
    }
    return map
  }, [history])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [hospitalRows, historyData] = await Promise.all([
        hospitalCoordinationService.listHospitals({
          search: search || undefined,
          regionId: regionId || undefined,
          districtId: districtId || undefined,
          isActive: true,
        }),
        hospitalCoordinationService.getRequestCoordinationHistory(request.id),
      ])
      setHospitals(Array.isArray(hospitalRows) ? hospitalRows : [])
      setHistory(historyData?.history ?? [])
    } catch {
      toast.error('Failed to load hospitals')
    } finally {
      setIsLoading(false)
    }
  }, [request.id, search, regionId, districtId])

  useEffect(() => {
    loadLocationReferenceData().then(({ regions: r, districts: d }) => {
      setRegions(r)
      setDistricts(d)
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    setSelectedBranchId('')
    setShowRejectForm(false)
    setRejectReason('')
    setRejectNotes('')
  }, [selectedHospitalId])

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateManualAssignHospitalForm(manualForm)
    setManualErrors(errors)
    if (hasManualAssignHospitalErrors(errors)) {
      toast.error(firstManualAssignHospitalError(errors) || 'Please fix the highlighted fields')
      return
    }
    try {
      setIsSubmitting(true)
      await hospitalCoordinationService.assignManualHospital(request.id, {
        name: manualForm.name.trim(),
        address: manualForm.address.trim(),
        regionId: manualForm.regionId,
        districtId: manualForm.districtId,
        hospitalType: manualForm.hospitalType || undefined,
        branchName: manualForm.branchName.trim() || undefined,
        branchAddress: manualForm.branchAddress.trim() || undefined,
        primaryPhone: manualForm.primaryPhone.trim() || undefined,
        emergencyHotline: manualForm.emergencyHotline.trim() || undefined,
        emergencyShortCode: manualForm.emergencyShortCode.trim() || undefined,
        contactPersonName: manualForm.contactPersonName.trim() || undefined,
        contactPersonRole: manualForm.contactPersonRole.trim() || undefined,
        email: manualForm.email.trim() || undefined,
        receivingStaffName: manualForm.receivingStaffName.trim() || undefined,
        notes: manualForm.notes.trim() || undefined,
      })
      toast.success(`${manualForm.name.trim()} saved and assigned as destination`)
      onSuccess()
      onClose()
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to assign manual destination'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAccept = async () => {
    if (!selectedHospital) return
    try {
      setIsSubmitting(true)
      const payload: {
        hospitalId: string
        outcome: 'ACCEPTED'
        branchId?: string
        branchName?: string
      } = {
        hospitalId: selectedHospital.id,
        outcome: 'ACCEPTED',
      }
      if (selectedBranch?.id) payload.branchId = selectedBranch.id
      if (selectedBranch?.name) payload.branchName = selectedBranch.name

      await hospitalCoordinationService.assignHospital(request.id, payload)
      toast.success(`${selectedHospital.name} assigned as destination`)
      onSuccess()
      onClose()
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to assign hospital'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!selectedHospital || !rejectReason) {
      toast.error('Select a refusal reason')
      return
    }
    try {
      setIsSubmitting(true)
      await hospitalCoordinationService.assignHospital(request.id, {
        hospitalId: selectedHospital.id,
        outcome: 'REJECTED',
        reason: rejectReason,
        notes: rejectNotes.trim() || undefined,
      })
      toast.success(`${selectedHospital.name} marked as rejected`)
      setShowRejectForm(false)
      setRejectReason('')
      setRejectNotes('')
      await loadData()
      onSuccess()
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to record rejection'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderHistoryBadge = (hospitalId: string) => {
    const item = historyByHospital.get(hospitalId)
    if (!item) return null
    if (item.stage === 'ACCEPTED' || item.status === 'ACCEPTED') {
      return (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
          Accepted
        </span>
      )
    }
    if (item.stage === 'REFUSED' || item.status === 'REJECTED') {
      return (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
          Rejected
        </span>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-end sm:items-center z-[130] p-0 sm:p-4">
      <div className="active-missions-modal bg-white w-full max-w-5xl max-h-[92vh] border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-teal-700 p-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Assign Hospital
            </h3>
            <p className="text-teal-100 text-xs mt-1">
              Case {request.trackingCode} — search the registry or enter destination details manually
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-3 border-b border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode('registry')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === 'registry'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search registry
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === 'manual'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            Manual entry
          </button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualAssign} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <p className="text-sm text-slate-600">
              Enter the hospital or place details below. The destination will be saved to the registry and assigned to this case.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ManualField label="Place / hospital name *" error={manualErrors.name} className="sm:col-span-2">
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="e.g. Medina Hospital"
                />
              </ManualField>
              <ManualField label="Hospital type" error={manualErrors.hospitalType}>
                <select
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.hospitalType}
                  onChange={(e) => setManualForm({ ...manualForm, hospitalType: e.target.value })}
                >
                  {MANUAL_HOSPITAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </ManualField>
              <ManualField label="Region *" error={manualErrors.regionId}>
                <select
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.regionId}
                  onChange={(e) => setManualForm({ ...manualForm, regionId: e.target.value, districtId: '' })}
                >
                  <option value="">Select region…</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </ManualField>
              <ManualField label="District *" error={manualErrors.districtId}>
                <select
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.districtId}
                  onChange={(e) => setManualForm({ ...manualForm, districtId: e.target.value })}
                  disabled={!manualForm.regionId}
                >
                  <option value="">Select district…</option>
                  {districts
                    .filter((d) => !manualForm.regionId || d.regionId === manualForm.regionId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </ManualField>
              <ManualField label="Location / address *" error={manualErrors.address} className="sm:col-span-2">
                <textarea
                  className="active-missions-field w-full min-h-[72px] p-3 rounded-xl border border-slate-200 text-sm resize-none"
                  value={manualForm.address}
                  onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                  placeholder="Street, area, landmarks…"
                />
              </ManualField>
              <ManualField label="Branch name (optional)" error={manualErrors.branchName}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.branchName}
                  onChange={(e) => setManualForm({ ...manualForm, branchName: e.target.value })}
                  placeholder="e.g. ER wing"
                />
              </ManualField>
              <ManualField label="Branch address (optional)" error={manualErrors.branchAddress}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.branchAddress}
                  onChange={(e) => setManualForm({ ...manualForm, branchAddress: e.target.value })}
                  placeholder="If different from main address"
                />
              </ManualField>
              <ManualField label="Primary phone (optional)" error={manualErrors.primaryPhone}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.primaryPhone}
                  onChange={(e) => setManualForm({ ...manualForm, primaryPhone: e.target.value })}
                  placeholder="+252…"
                />
              </ManualField>
              <ManualField label="Emergency hotline (optional)" error={manualErrors.emergencyHotline}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.emergencyHotline}
                  onChange={(e) => setManualForm({ ...manualForm, emergencyHotline: e.target.value })}
                  placeholder="+252…"
                />
              </ManualField>
              <ManualField label="Emergency short code (optional)" error={manualErrors.emergencyShortCode}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.emergencyShortCode}
                  onChange={(e) => setManualForm({ ...manualForm, emergencyShortCode: e.target.value })}
                  placeholder="e.g. 999"
                />
              </ManualField>
              <ManualField label="Contact person (optional)" error={manualErrors.contactPersonName}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.contactPersonName}
                  onChange={(e) => setManualForm({ ...manualForm, contactPersonName: e.target.value })}
                  placeholder="Receiving coordinator name"
                />
              </ManualField>
              <ManualField label="Contact role (optional)" error={manualErrors.contactPersonRole}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.contactPersonRole}
                  onChange={(e) => setManualForm({ ...manualForm, contactPersonRole: e.target.value })}
                  placeholder="e.g. Emergency coordinator"
                />
              </ManualField>
              <ManualField label="Email (optional)" error={manualErrors.email}>
                <input
                  type="email"
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  placeholder="hospital@example.com"
                />
              </ManualField>
              <ManualField label="Receiving staff (optional)" error={manualErrors.receivingStaffName}>
                <input
                  className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                  value={manualForm.receivingStaffName}
                  onChange={(e) => setManualForm({ ...manualForm, receivingStaffName: e.target.value })}
                  placeholder="Doctor or nurse receiving the patient"
                />
              </ManualField>
              <ManualField label="Assignment notes (optional)" error={manualErrors.notes} className="sm:col-span-2">
                <textarea
                  className="active-missions-field w-full min-h-[72px] p-3 rounded-xl border border-slate-200 text-sm resize-none"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Any extra details for the field team or hospital"
                />
              </ManualField>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="active-missions-btn-secondary flex-1 rounded-xl font-bold h-11"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="active-missions-btn-primary flex-1 rounded-xl font-bold h-11 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save & assign destination
              </button>
            </div>
          </form>
        ) : (
          <>
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="active-missions-field w-full pl-10 h-10 rounded-xl border border-slate-200 text-sm"
              placeholder="Search hospitals by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value)
              setDistrictId('')
            }}
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
          >
            <option value="">All districts</option>
            {districts
              .filter((d) => !regionId || d.regionId === regionId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className="overflow-y-auto p-4 space-y-2 min-h-[240px]">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                Loading hospitals…
              </div>
            ) : hospitals.length === 0 ? (
              <p className="py-16 text-center text-slate-500 text-sm">No hospitals match your filters</p>
            ) : (
              hospitals.map((hospital) => {
                const isSelected = selectedHospitalId === hospital.id
                return (
                  <button
                    key={hospital.id}
                    type="button"
                    onClick={() => setSelectedHospitalId(hospital.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                        : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{hospital.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{hospital.hospitalCode}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {hospital.region?.name}/{hospital.district?.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {hospital.availabilityStatus || 'Unknown'}
                        </span>
                        {renderHistoryBadge(hospital.id)}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="overflow-y-auto p-4 min-h-[240px]">
            {!selectedHospital ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Building2 className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-semibold">Select a hospital to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-black text-slate-900">{selectedHospital.name}</h4>
                  <p className="text-xs text-slate-500">{selectedHospital.hospitalType}</p>
                </div>

                <DetailRow icon={MapPin} label="Location">
                  <p>{selectedHospital.address || '—'}</p>
                  <p className="text-slate-500">
                    {selectedHospital.region?.name}/{selectedHospital.district?.name}
                  </p>
                </DetailRow>

                <DetailRow icon={Phone} label="Contact">
                  <p>{selectedHospital.primaryPhone || '—'}</p>
                  {selectedHospital.secondaryPhone && <p>{selectedHospital.secondaryPhone}</p>}
                  {(selectedHospital.emergencyShortCode || selectedHospital.emergencyHotline) && (
                    <p className="text-teal-700 font-bold">
                      Emergency: {selectedHospital.emergencyShortCode || selectedHospital.emergencyHotline}
                    </p>
                  )}
                  {selectedHospital.email && <p>{selectedHospital.email}</p>}
                </DetailRow>

                <DetailRow icon={Stethoscope} label="Services provided">
                  {parseCapabilities(selectedHospital.medicalCapabilities).length === 0 ? (
                    <p className="text-slate-500">No services listed</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {parseCapabilities(selectedHospital.medicalCapabilities).map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </DetailRow>

                {branches.length > 0 && (
                  <DetailRow icon={GitBranch} label="Branches / locations">
                    <div className="space-y-2">
                      {branches.map((branch: HospitalBranchRecord) => (
                        <label
                          key={branch.id}
                          className={`block p-2 rounded-lg border cursor-pointer ${
                            selectedBranchId === branch.id
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="branch"
                            className="sr-only"
                            checked={selectedBranchId === branch.id}
                            onChange={() => setSelectedBranchId(branch.id)}
                          />
                          <p className="font-semibold text-sm">{branch.name}</p>
                          <p className="text-xs text-slate-500">{branch.address}</p>
                          <p className="text-xs text-slate-600">{branch.primaryPhone}</p>
                        </label>
                      ))}
                    </div>
                  </DetailRow>
                )}

                {historyByHospital.get(selectedHospital.id) && (
                  <div className="active-missions-rejected-card rounded-xl border border-slate-200 p-3 text-xs">
                    <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">
                      Coordination record
                    </p>
                    {(() => {
                      const item = historyByHospital.get(selectedHospital.id)!
                      if (item.stage === 'ACCEPTED' || item.status === 'ACCEPTED') {
                        return <p className="text-emerald-700 font-semibold">Accepted for this case</p>
                      }
                      return (
                        <>
                          <p className="text-rose-700 font-semibold">
                            Rejected — {refusalReasonLabel(item.refusalReason)}
                          </p>
                          {item.refusalNotes && <p className="text-slate-600 mt-1">{item.refusalNotes}</p>}
                        </>
                      )
                    })()}
                  </div>
                )}

                {!showRejectForm ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={isSubmitting}
                      className="active-missions-btn-primary flex-1 rounded-xl font-bold h-11 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Accept hospital
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isSubmitting}
                      className="active-missions-action-btn active-missions-action-btn--cancel flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Rejection reason
                    </p>
                    <select
                      className="active-missions-field w-full h-10 rounded-xl border border-slate-200 text-sm px-3"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    >
                      <option value="">Select reason…</option>
                      {REFUSAL_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="active-missions-field w-full h-24 p-3 rounded-xl border border-slate-200 text-sm resize-none"
                      placeholder="Additional notes (optional)"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="active-missions-btn-secondary flex-1 rounded-xl font-bold h-10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={isSubmitting || !rejectReason}
                        className="active-missions-btn-danger flex-1 rounded-xl font-bold h-10 disabled:opacity-60"
                      >
                        Submit rejection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50 shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Hospital coordination for this case
            </p>
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <span
                  key={item.id}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                    item.stage === 'ACCEPTED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {item.hospitalName}: {item.stage === 'ACCEPTED' ? 'Accepted' : 'Rejected'}
                </span>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

function ManualField({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={className}>
      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  )
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}
