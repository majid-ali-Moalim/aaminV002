'use client'

import { AlertTriangle, Building2, Clock, Flag, CheckCircle } from 'lucide-react'
import { Priority } from '@/types'
import type { District, Region } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import { FieldLabel, fieldInputClass, FormActions, SectionCard } from './ui'
import HospitalDestinationPicker, { type HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import type { DispatchFormErrors, ReferralDispatchForm } from './types'

const PRIORITIES = [
  { id: Priority.CRITICAL, label: 'Critical', icon: AlertTriangle },
  { id: Priority.HIGH, label: 'High', icon: Flag },
  { id: Priority.MEDIUM, label: 'Medium', icon: Clock },
  { id: Priority.LOW, label: 'Low', icon: CheckCircle },
]

type Props = {
  form: ReferralDispatchForm
  errors: DispatchFormErrors
  regions: Region[]
  districts: District[]
  hospitals: HospitalOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<ReferralDispatchForm>) => void
  onRegionChange: (regionId: string) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function ReferralDispatchFormView({
  form,
  errors,
  regions,
  districts,
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
      <SectionCard title="Hospital Referral" icon={Building2} iconBg="bg-emerald-100 text-emerald-600">
        <p className="text-sm text-slate-600 mb-5">
          Transfer a patient from one healthcare facility to another with full referral documentation.
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
            />
          </div>
          <div>
            <FieldLabel required error={errors.referringHospital}>Referring Hospital</FieldLabel>
            <input
              list="referring-hospitals"
              className={fieldInputClass(errors.referringHospital)}
              value={form.referringHospital}
              onChange={(e) => onChange({ referringHospital: e.target.value })}
            />
            <datalist id="referring-hospitals">
              {hospitals.map((h) => (
                <option key={h.id} value={h.name} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <HospitalDestinationPicker
              hospitals={hospitals}
              hospitalId={form.receivingHospitalId}
              branchId={form.receivingHospitalBranchId}
              required
              hospitalError={errors.receivingHospitalId}
              branchError={errors.receivingHospitalBranchId}
              onHospitalChange={(hospitalId, branchId, branchName) =>
                onChange({
                  receivingHospitalId: hospitalId,
                  receivingHospitalBranchId: branchId,
                  receivingHospitalBranchName: branchName,
                  receivingHospital: branchName,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.referralReason}>Reason for Referral</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.referralReason)} h-auto min-h-[72px] py-3 resize-y`}
              rows={2}
              value={form.referralReason}
              onChange={(e) => onChange({ referralReason: e.target.value })}
            />
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
          <div>
            <FieldLabel error={errors.referringDoctor}>Referring Doctor</FieldLabel>
            <input
              className={fieldInputClass(errors.referringDoctor)}
              value={form.referringDoctor}
              onChange={(e) => onChange({ referringDoctor: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel error={errors.requiredEquipment}>Required Equipment</FieldLabel>
            <input
              className={fieldInputClass(errors.requiredEquipment)}
              value={form.requiredEquipment}
              onChange={(e) => onChange({ requiredEquipment: e.target.value })}
              placeholder="Oxygen, monitor, etc."
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.patientConditionSummary}>Patient Condition Summary</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.patientConditionSummary)} h-auto min-h-[72px] py-3 resize-y`}
              rows={2}
              value={form.patientConditionSummary}
              onChange={(e) => onChange({ patientConditionSummary: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.medicalNotes}>Medical Notes</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.medicalNotes)} h-auto min-h-[72px] py-3 resize-y`}
              rows={2}
              value={form.medicalNotes}
              onChange={(e) => onChange({ medicalNotes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.additionalNotes}>Additional Notes</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.additionalNotes)} h-auto min-h-[72px] py-3 resize-y`}
              rows={2}
              value={form.additionalNotes}
              onChange={(e) => onChange({ additionalNotes: e.target.value })}
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
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${selected ? 'text-emerald-600' : 'opacity-40'}`} />
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
        submitLabel="Submit Referral Request"
      />
    </div>
  )
}
