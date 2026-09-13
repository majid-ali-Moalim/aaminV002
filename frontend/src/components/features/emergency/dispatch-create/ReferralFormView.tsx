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
import type { CustomHospitalDraft } from '@/components/hospitals/CustomHospitalModal'
import { isOtherReferralReason, REFERRAL_REASON_OPTIONS } from '@/lib/emergency/referralReasons'
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
  onCreateCustomHospital?: (draft: CustomHospitalDraft) => Promise<HospitalOption | null>
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
  onCreateCustomHospital,
  onCancel,
  onSubmit,
  submitting,
}: Props) {
  const showOtherReason = isOtherReferralReason(form.referralReason)

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
          <div className="sm:col-span-2">
            <HospitalDestinationPicker
              combobox
              branchRequired={false}
              hospitals={hospitals}
              hospitalLabel="Referring Hospital"
              hospitalPlaceholder="Select or type referring hospital"
              hospitalId={form.referringHospitalId}
              hospitalName={form.referringHospital}
              branchId={form.referringHospitalBranchId}
              branchName={form.referringHospitalBranchName}
              required
              hospitalError={errors.referringHospitalId}
              branchError={errors.referringHospitalBranchId}
              onHospitalChange={(hospitalId, hospitalName, branchId, branchName) =>
                onChange({
                  referringHospitalId: hospitalId,
                  referringHospitalBranchId: branchId,
                  referringHospitalBranchName: branchName,
                  referringHospital: branchName
                    ? `${hospitalName}${hospitalName && branchName ? ' — ' : ''}${branchName}`
                    : hospitalName,
                })
              }
              onCreateCustomHospital={onCreateCustomHospital}
            />
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
                  receivingHospital: branchName
                    ? `${hospitalName}${hospitalName && branchName ? ' — ' : ''}${branchName}`
                    : hospitalName,
                })
              }
              onCreateCustomHospital={onCreateCustomHospital}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.referralReason}>Reason for Referral</FieldLabel>
            <select
              className={fieldInputClass(errors.referralReason)}
              value={form.referralReason}
              onChange={(e) =>
                onChange({
                  referralReason: e.target.value,
                  referralReasonOther: e.target.value === 'OTHER' ? form.referralReasonOther : '',
                })
              }
            >
              <option value="">Select reason…</option>
              {REFERRAL_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {showOtherReason && (
            <div className="sm:col-span-2">
              <FieldLabel required error={errors.referralReasonOther}>Describe referral reason</FieldLabel>
              <input
                className={fieldInputClass(errors.referralReasonOther)}
                value={form.referralReasonOther}
                onChange={(e) => onChange({ referralReasonOther: e.target.value })}
                placeholder="Enter the specific reason for this referral"
                maxLength={500}
              />
            </div>
          )}
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
          <div className="sm:col-span-2">
            <FieldLabel error={errors.additionalNotes}>Additional Notes</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.additionalNotes)} h-auto min-h-[72px] py-3 resize-y`}
              rows={2}
              value={form.additionalNotes}
              onChange={(e) => onChange({ additionalNotes: e.target.value })}
              placeholder="Any other details for dispatch or receiving hospital"
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
