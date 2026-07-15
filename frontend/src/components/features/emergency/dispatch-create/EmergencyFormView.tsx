'use client'

import { AlertTriangle, Clock, Flag, CheckCircle } from 'lucide-react'
import { Priority } from '@/types'
import type { EmergencyTypeOption } from '@/lib/emergency/emergencyTypes'
import type { District, Region } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import HospitalDestinationPicker, { type HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import { FieldLabel, fieldInputClass, FormActions, SectionCard } from './ui'
import type { DispatchFormErrors, EmergencyDispatchForm } from './types'
import { AlertOctagon } from 'lucide-react'

const PRIORITIES = [
  { id: Priority.CRITICAL, label: 'Critical', icon: AlertTriangle },
  { id: Priority.HIGH, label: 'High', icon: Flag },
  { id: Priority.MEDIUM, label: 'Medium', icon: Clock },
  { id: Priority.LOW, label: 'Low', icon: CheckCircle },
]

type Props = {
  form: EmergencyDispatchForm
  errors: DispatchFormErrors
  regions: Region[]
  districts: District[]
  emergencyTypes: EmergencyTypeOption[]
  hospitals: HospitalOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<EmergencyDispatchForm>) => void
  onRegionChange: (regionId: string) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function EmergencyDispatchFormView({
  form,
  errors,
  regions,
  districts,
  emergencyTypes,
  hospitals,
  loadingDistricts,
  onChange,
  onRegionChange,
  onCancel,
  onSaveDraft,
  onSubmit,
  submitting,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionCard title="Emergency Request" icon={AlertOctagon} iconBg="bg-red-100 text-red-600">
        <p className="text-sm text-slate-600 mb-5">
          Short form for life-threatening cases — dispatch speed is the priority. Add more details later if needed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required error={errors.patientName}>Patient Name</FieldLabel>
            <input
              className={fieldInputClass(errors.patientName)}
              value={form.patientName}
              onChange={(e) => onChange({ patientName: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required error={errors.phone}>Phone Number</FieldLabel>
            <input
              className={fieldInputClass(errors.phone)}
              value={form.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="61XXXXXXX"
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.emergencyTypeId}>Emergency Type</FieldLabel>
            <select
              className={fieldInputClass(errors.emergencyTypeId)}
              value={form.emergencyTypeId}
              onChange={(e) => onChange({ emergencyTypeId: e.target.value })}
            >
              <option value="">Select emergency type</option>
              {emergencyTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel required error={errors.regionId}>Region</FieldLabel>
            <select
              className={fieldInputClass(errors.regionId)}
              value={form.regionId}
              onChange={(e) => onRegionChange(e.target.value)}
            >
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel required error={errors.districtId}>District</FieldLabel>
            <select
              className={fieldInputClass(errors.districtId)}
              value={form.districtId}
              onChange={(e) => onChange({ districtId: e.target.value })}
              disabled={!form.regionId || loadingDistricts}
            >
              <option value="">{loadingDistricts ? 'Loading…' : 'Select district'}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.landmark}>Landmark</FieldLabel>
            <input
              className={fieldInputClass(errors.landmark)}
              value={form.landmark}
              onChange={(e) => onChange({ landmark: e.target.value })}
              placeholder="Near main mosque, market, etc."
            />
          </div>
          <div>
            <FieldLabel error={errors.areaStreet}>Area / Street</FieldLabel>
            <input
              className={fieldInputClass(errors.areaStreet)}
              value={form.areaStreet}
              onChange={(e) => onChange({ areaStreet: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel error={errors.additionalDirections}>Additional Directions</FieldLabel>
            <input
              className={fieldInputClass(errors.additionalDirections)}
              value={form.additionalDirections}
              onChange={(e) => onChange({ additionalDirections: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <HospitalDestinationPicker
              hospitals={hospitals}
              hospitalId={form.destinationHospitalId}
              branchId={form.destinationHospitalBranchId}
              required
              hospitalError={errors.destinationHospitalId}
              branchError={errors.destinationHospitalBranchId}
              onHospitalChange={(hospitalId, branchId, branchName) =>
                onChange({
                  destinationHospitalId: hospitalId,
                  destinationHospitalBranchId: branchId,
                  destinationHospitalBranchName: branchName,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.briefDescription}>Brief Description</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.briefDescription)} h-auto min-h-[88px] py-3 resize-y`}
              rows={3}
              value={form.briefDescription}
              onChange={(e) => onChange({ briefDescription: e.target.value })}
              placeholder="What happened? Key symptoms…"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Priority"
        icon={Flag}
        iconBg="bg-orange-100 text-orange-600"
        badge={<PriorityBadge priority={form.priority} size="sm" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRIORITIES.map((p) => {
            const Icon = p.icon
            const selected = form.priority === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ priority: p.id })}
                className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                  selected
                    ? 'border-red-500 bg-red-50 text-red-800 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${selected ? 'text-red-600' : 'opacity-40'}`} />
                <span className="text-[10px] font-black uppercase">{p.label}</span>
              </button>
            )
          })}
        </div>
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Emergency Request"
      />
    </div>
  )
}
