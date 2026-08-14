'use client'

import { AlertOctagon } from 'lucide-react'
import type { District } from '@/types'
import PatientNameField from './PatientNameField'
import { FieldLabel, fieldInputClass, FormActions, SectionCard, phoneDigitsOnly } from './ui'
import type { DispatchFormErrors, EmergencyDispatchForm } from './types'

type Props = {
  form: EmergencyDispatchForm
  errors: DispatchFormErrors
  banadirRegionName: string
  districts: District[]
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
  loadingDistricts,
  onChange,
  onCancel,
  onSubmit,
  submitting,
}: Props) {
  return (
    <div className="space-y-6">
      <SectionCard title="Emergency Request" icon={AlertOctagon} iconBg="bg-red-100 text-red-600">
        <p className="text-sm text-slate-600 mb-5">
          Quick intake — only essential details needed now. Triage, priority, and other fields can be
          completed when the case is closed.
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

      <FormActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Emergency Request"
      />
    </div>
  )
}
