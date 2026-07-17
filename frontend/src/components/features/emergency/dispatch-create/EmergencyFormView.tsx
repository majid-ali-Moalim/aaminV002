'use client'

import { AlertTriangle, Clock, Flag, CheckCircle, AlertOctagon } from 'lucide-react'
import { Priority } from '@/types'
import type { EmergencyTypeOption } from '@/lib/emergency/emergencyTypes'
import { isOtherEmergencyType } from '@/lib/emergency/emergencyTypes'
import type { District, Region } from '@/types'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StationAssignmentField from '@/components/features/emergency/StationAssignmentField'
import PatientNameField from './PatientNameField'
import { FieldLabel, fieldInputClass, FormActions, SectionCard, phoneDigitsOnly } from './ui'
import type { DispatchFormErrors, EmergencyDispatchForm } from './types'

const PRIORITIES = [
  { id: Priority.CRITICAL, label: 'Critical', icon: AlertTriangle, disabled: false },
  { id: Priority.HIGH, label: 'High', icon: Flag, disabled: false },
  { id: Priority.MEDIUM, label: 'Medium', icon: Clock, disabled: true },
  { id: Priority.LOW, label: 'Low', icon: CheckCircle, disabled: true },
]

type Props = {
  form: EmergencyDispatchForm
  errors: DispatchFormErrors
  banadirRegionName: string
  districts: District[]
  emergencyTypes: EmergencyTypeOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<EmergencyDispatchForm>) => void
  onCancel: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function EmergencyDispatchFormView({
  form,
  errors,
  banadirRegionName,
  districts,
  emergencyTypes,
  loadingDistricts,
  onChange,
  onCancel,
  onSubmit,
  submitting,
}: Props) {
  const selectedType = emergencyTypes.find((t) => t.id === form.emergencyTypeId)
  const showOtherType = selectedType && isOtherEmergencyType(selectedType)

  return (
    <div className="space-y-6">
      <SectionCard title="Emergency Request" icon={AlertOctagon} iconBg="bg-red-100 text-red-600">
        <p className="text-sm text-slate-600 mb-5">
          Short form for life-threatening cases — dispatch speed is the priority. Add more details later if needed.
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
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.emergencyTypeId}>Emergency Type</FieldLabel>
            <select
              className={fieldInputClass(errors.emergencyTypeId)}
              value={form.emergencyTypeId}
              onChange={(e) =>
                onChange({
                  emergencyTypeId: e.target.value,
                  emergencyTypeOther: '',
                })
              }
            >
              <option value="">Select emergency type</option>
              {emergencyTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {showOtherType && (
            <div className="sm:col-span-2">
              <FieldLabel required error={errors.emergencyTypeOther}>Describe other emergency</FieldLabel>
              <input
                className={fieldInputClass(errors.emergencyTypeOther)}
                value={form.emergencyTypeOther}
                onChange={(e) => onChange({ emergencyTypeOther: e.target.value })}
                placeholder="What type of emergency is this?"
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
            <FieldLabel error={errors.landmark}>
              Landmark <span className="text-slate-400 font-normal">(optional)</span>
            </FieldLabel>
            <input
              className={fieldInputClass(errors.landmark)}
              value={form.landmark}
              onChange={(e) => onChange({ landmark: e.target.value })}
              placeholder="Near main mosque, market, etc."
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.areaStreet}>
              Area / Street <span className="text-slate-400 font-normal">(optional)</span>
            </FieldLabel>
            <input
              className={fieldInputClass(errors.areaStreet)}
              value={form.areaStreet}
              onChange={(e) => onChange({ areaStreet: e.target.value })}
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
                disabled={p.disabled}
                onClick={() => !p.disabled && onChange({ priority: p.id })}
                className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                  p.disabled
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
                    : selected
                      ? 'border-red-500 bg-red-50 text-red-800 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${selected && !p.disabled ? 'text-red-600' : 'opacity-40'}`} />
                <span className="text-[10px] font-black uppercase">{p.label}</span>
                {p.disabled && (
                  <span className="text-[8px] font-bold uppercase text-slate-400">Inactive</span>
                )}
              </button>
            )
          })}
        </div>
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Emergency Request"
      />
    </div>
  )
}
