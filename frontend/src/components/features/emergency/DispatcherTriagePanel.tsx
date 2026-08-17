'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2,
  Phone,
  Save,
  Stethoscope,
  Truck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import type { EmergencyRequest, Priority } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'
import {
  BREATHING_UI_OPTIONS,
  normalizeBreathingStatus,
} from '@/lib/emergency/callerReport'
import {
  BLEEDING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
  TRIAGE_PRIORITY_OPTIONS,
} from '@/lib/emergency/triageOptions'
import { buildSimpleCaseSummary } from '@/lib/emergency/simpleCaseSummary'
import { autoAssignAvailableCrew } from '@/lib/emergency/autoAssignCrew'
import { caseRequiresNurse } from '@/lib/emergency/caseNurseRequirement'
import { getCaseStationLabels } from '@/lib/emergency/caseStationLabels'
import CaseStationTransferPanel from '@/components/features/emergency/CaseStationTransferPanel'
import { useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'

type TriageForm = {
  priority: Priority
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  patientCondition: string
  symptoms: string
  manualDispatchNotes: string
}

function formFromRequest(request: EmergencyRequest): TriageForm {
  return {
    priority: request.priority,
    consciousStatus: request.consciousStatus || 'CONSCIOUS',
    breathingStatus: normalizeBreathingStatus(request.breathingStatus),
    bleedingStatus: request.bleedingStatus || 'NONE',
    patientCondition: request.patientCondition || '',
    symptoms: request.symptoms || '',
    manualDispatchNotes: request.manualDispatchNotes || '',
  }
}

function CompactChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                selected
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Props = {
  request: EmergencyRequest
  onSaved: (updated: EmergencyRequest) => void
  onAssign: () => void
  onAssigned?: () => void
  onTransferred?: (updated: EmergencyRequest) => void
}

export default function DispatcherTriagePanel({
  request,
  onSaved,
  onAssign,
  onAssigned,
  onTransferred,
}: Props) {
  const portal = useEmergencyPortal()
  const isDispatcherPortal = portal === 'dispatcher'

  const [form, setForm] = useState<TriageForm>(() => formFromRequest(request))
  const [saving, setSaving] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)

  useEffect(() => {
    setForm(formFromRequest(request))
  }, [request.id])

  const summary = buildSimpleCaseSummary(request)
  const { stationName } = getCaseStationLabels(request)
  const nurseRequired = caseRequiresNurse(request)
  const phone = request.callerPhone || request.patient?.phone

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await emergencyRequestsService.update(request.id, {
        priority: form.priority,
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientCondition: form.patientCondition.trim() || null,
        symptoms: form.symptoms.trim() || null,
        manualDispatchNotes: form.manualDispatchNotes.trim() || null,
      })
      toast.success('Assessment saved')
      onSaved({
        ...request,
        ...updated,
        priority: form.priority,
        consciousStatus: form.consciousStatus,
        breathingStatus: form.breathingStatus,
        bleedingStatus: form.bleedingStatus,
        patientCondition: form.patientCondition.trim() || null,
        symptoms: form.symptoms.trim() || null,
        manualDispatchNotes: form.manualDispatchNotes.trim() || null,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save assessment')
    } finally {
      setSaving(false)
    }
  }

  const handleAutoAssign = async () => {
    setAutoAssigning(true)
    try {
      const result = await autoAssignAvailableCrew(request, { isDispatcherPortal })
      const parts = [
        result.ambulanceNumber,
        result.driverName,
        result.nurseName,
      ].filter(Boolean)
      toast.success(`Assigned: ${parts.join(' · ')}`)
      onAssigned?.()
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || 'Auto-assign failed')
    } finally {
      setAutoAssigning(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Case facts — no duplicate fields */}
      <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Caller priority</span>
            <PriorityBadge priority={request.priority} size="sm" />
          </div>
          {stationName && (
            <span className="text-xs font-semibold text-slate-600">
              Station: {stationName}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {summary.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {row.label}
              </dt>
              <dd className="text-sm text-slate-800 mt-0.5">{row.value}</dd>
            </div>
          ))}
        </dl>

        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Phone className="w-3.5 h-3.5" />
            Call {phone}
          </a>
        )}
      </section>

      {/* Assessment */}
      <section className="rounded-xl border border-slate-100 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Stethoscope className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-black text-slate-900">Your assessment</h3>
          <PriorityBadge priority={form.priority} size="sm" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {TRIAGE_PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, priority: opt.value }))}
              className={`rounded-lg border p-2 text-left transition-all ${
                form.priority === opt.value
                  ? 'border-red-500 bg-red-50 ring-1 ring-red-500/20'
                  : 'border-slate-200 hover:border-red-200'
              }`}
            >
              <p className="text-xs font-black text-slate-900">{opt.label}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <CompactChipGroup
            label="Conscious"
            value={form.consciousStatus}
            options={CONSCIOUS_STATUS_OPTIONS}
            onChange={(consciousStatus) => setForm((f) => ({ ...f, consciousStatus }))}
          />
          <CompactChipGroup
            label="Breathing"
            value={form.breathingStatus}
            options={BREATHING_UI_OPTIONS}
            onChange={(breathingStatus) => setForm((f) => ({ ...f, breathingStatus }))}
          />
          <CompactChipGroup
            label="Bleeding"
            value={form.bleedingStatus}
            options={BLEEDING_STATUS_OPTIONS}
            onChange={(bleedingStatus) => setForm((f) => ({ ...f, bleedingStatus }))}
          />
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700">Verified notes</span>
          <textarea
            value={form.patientCondition}
            onChange={(e) => setForm((f) => ({ ...f, patientCondition: e.target.value }))}
            rows={2}
            placeholder="What you confirmed with the caller…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-700">Internal notes</span>
          <textarea
            value={form.manualDispatchNotes}
            onChange={(e) => setForm((f) => ({ ...f, manualDispatchNotes: e.target.value }))}
            rows={2}
            placeholder="Notes for the crew…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 resize-y"
          />
        </label>

        {nurseRequired && (
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Nurse required — auto-assign will include an available nurse when possible.
          </p>
        )}
      </section>

      <PickupGpsPanel request={request} variant="compact" />

      {onTransferred && (
        <CaseStationTransferPanel request={request} onTransferred={onTransferred} />
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={handleAutoAssign}
          disabled={autoAssigning || saving}
          className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black shadow-md"
        >
          {autoAssigning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Assign available crew
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAssign}
          className="flex-1 h-11 rounded-xl font-bold border-slate-200"
        >
          <Truck className="w-4 h-4 mr-2" />
          Choose crew
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={saving || autoAssigning}
          className="sm:w-auto h-11 rounded-xl font-bold border-slate-200"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  )
}
