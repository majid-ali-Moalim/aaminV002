'use client'

import { Truck } from 'lucide-react'
import { BOOKING_TIME_SLOTS, TRANSPORT_TYPES } from '@/components/public/hire-ambulance/constants'
import type { District, Region } from '@/types'
import { FieldLabel, fieldInputClass, FormActions, SectionCard } from './ui'
import HospitalDestinationPicker, { type HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import type { DispatchFormErrors, NonEmergencyDispatchForm } from './types'

type Props = {
  form: NonEmergencyDispatchForm
  errors: DispatchFormErrors
  regions: Region[]
  districts: District[]
  hospitals: HospitalOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<NonEmergencyDispatchForm>) => void
  onRegionChange: (regionId: string) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function NonEmergencyDispatchFormView({
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
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <SectionCard title="Non-Emergency Transport" icon={Truck} iconBg="bg-blue-100 text-blue-600">
        <p className="text-sm text-slate-600 mb-5">
          Scheduled or non-urgent medical transportation — appointments, discharges, and routine transfers.
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
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.transportType}>Transport Type</FieldLabel>
            <select
              className={fieldInputClass(errors.transportType)}
              value={form.transportType}
              onChange={(e) => onChange({ transportType: e.target.value })}
            >
              <option value="">Select transport type</option>
              {TRANSPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel required error={errors.regionId}>Pickup Region</FieldLabel>
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
            <FieldLabel required error={errors.districtId}>Pickup District</FieldLabel>
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
            <FieldLabel required error={errors.pickupAddress}>Pickup Address</FieldLabel>
            <input
              className={fieldInputClass(errors.pickupAddress)}
              value={form.pickupAddress}
              onChange={(e) => onChange({ pickupAddress: e.target.value })}
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
                  destination: branchName,
                })
              }
            />
          </div>
          <div>
            <FieldLabel required error={errors.bookingDate}>Booking Date</FieldLabel>
            <input
              type="date"
              min={today}
              className={fieldInputClass(errors.bookingDate)}
              value={form.bookingDate}
              onChange={(e) => onChange({ bookingDate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required error={errors.bookingTime}>Booking Time</FieldLabel>
            <select
              className={fieldInputClass(errors.bookingTime)}
              value={form.bookingTime}
              onChange={(e) => onChange({ bookingTime: e.target.value })}
            >
              <option value="">Select time</option>
              {BOOKING_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.mobilityRequirement}>Mobility Requirement</FieldLabel>
            <input
              className={fieldInputClass(errors.mobilityRequirement)}
              value={form.mobilityRequirement}
              onChange={(e) => onChange({ mobilityRequirement: e.target.value })}
              placeholder="e.g. wheelchair user, bed-bound"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.wheelchairNeeded}
                onChange={(e) => onChange({ wheelchairNeeded: e.target.checked })}
                className="h-4 w-4 accent-blue-600"
              />
              Wheelchair needed
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.stretcherNeeded}
                onChange={(e) => onChange({ stretcherNeeded: e.target.checked })}
                className="h-4 w-4 accent-blue-600"
              />
              Stretcher needed
            </label>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel error={errors.specialInstructions}>Special Instructions</FieldLabel>
            <textarea
              className={`${fieldInputClass(errors.specialInstructions)} h-auto min-h-[80px] py-3 resize-y`}
              rows={3}
              value={form.specialInstructions}
              onChange={(e) => onChange({ specialInstructions: e.target.value })}
            />
          </div>
        </div>
      </SectionCard>

      <FormActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Booking Request"
      />
    </div>
  )
}
