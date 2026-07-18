'use client'

import { AlertTriangle, Building2, Clock, Flag, CheckCircle } from 'lucide-react'
import { Priority } from '@/types'
import type { District } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StationAssignmentField from '@/components/features/emergency/StationAssignmentField'
import PatientNameField from './PatientNameField'
import PatientDemographicsFields from './PatientDemographicsFields'
import { FieldLabel, fieldInputClass, FormActions, SectionCard, phoneDigitsOnly } from './ui'
import NurseRequiredField from './NurseRequiredField'
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
  banadirRegionName: string
  districts: District[]
  hospitals: HospitalOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<ReferralDispatchForm>) => void
  onCancel: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function ReferralDispatchFormView({
  form,
  errors,
  banadirRegionName,
  districts,
  hospitals,
  loadingDistricts,
  onChange,
  onCancel,
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
          <PatientNameField
            value={form.patientName}
            error={errors.patientName}
            onChange={(patientName) => onChange({ patientName })}
          />
          <div>
            <FieldLabel required error={errors.phone}>Phone Number</FieldLabel>
            <input
              className={fieldInputClass(errors.phone)}
              value={form.phone}
              inputMode="numeric"
              maxLength={9}
              onChange={(e) => onChange({ phone: phoneDigitsOnly(e.target.value) })}
              placeholder="61XXXXXXX"
            />
          </div>
          <PatientDemographicsFields
            ageGroup={form.ageGroup}
            gender={form.gender}
            ageGroupError={errors.ageGroup}
            genderError={errors.gender}
            onChange={(patch) => onChange(patch)}
          />
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
              combobox
              branchRequired={false}
              hospitals={hospitals}
              hospitalLabel="Receiving Hospital or Place"
              hospitalId={form.receivingHospitalId}
              hospitalName={form.receivingHospital}
              branchId={form.receivingHospitalBranchId}
              branchName={form.receivingHospitalBranchName}
              required
              hospitalError={errors.receivingHospitalId}
              branchError={errors.receivingHospitalBranchId}
              onHospitalChange={(hospitalId, hospitalName, branchId, branchName) =>
                onChange({
                  receivingHospitalId: hospitalId,
                  receivingHospitalBranchId: branchId,
                  receivingHospitalBranchName: branchName,
                  receivingHospital: hospitalName || branchName,
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
            <FieldLabel required>Region</FieldLabel>
            <input
              className={`${fieldInputClass()} bg-slate-100 text-slate-600 cursor-not-allowed`}
              value={banadirRegionName}
              readOnly
            />
          </div>
          <div>
            <FieldLabel required error={errors.districtId}>District</FieldLabel>
            <select
              className={fieldInputClass(errors.districtId)}
              value={form.districtId}
              onChange={(e) => onChange({ districtId: e.target.value, stationId: '' })}
              disabled={loadingDistricts}
            >
              <option value="">{loadingDistricts ? 'Loading…' : 'Select district'}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <StationAssignmentField
            regionId={form.regionId}
            districtId={form.districtId}
            stationId={form.stationId}
            error={errors.stationId}
            onChange={(stationId) => onChange({ stationId })}
          />
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

      <NurseRequiredField
        needsNurse={form.needsNurse}
        error={errors.needsNurse}
        onChange={(value) => onChange({ needsNurse: value })}
      />

      <FormActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Referral Request"
      />
    </div>
  )
}
