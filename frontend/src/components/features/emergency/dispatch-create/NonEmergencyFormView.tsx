'use client'

import { Truck } from 'lucide-react'
import { DISPATCH_NON_EMERGENCY_TRANSPORT_TYPES, getBookingDateTimeBounds, isBookingWithin24Hours, isFuneralTransport } from '@/lib/emergency/dispatchFormShared'
import type { District } from '@/types'
import StationAssignmentField from '@/components/features/emergency/StationAssignmentField'
import PatientNameField from './PatientNameField'
import PatientDemographicsFields from './PatientDemographicsFields'
import { FieldLabel, fieldInputClass, FormActions, SectionCard, phoneDigitsOnly } from './ui'
import NurseRequiredField from './NurseRequiredField'
import HospitalDestinationPicker, { type HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import type { DispatchFormErrors, NonEmergencyDispatchForm } from './types'

type Props = {
  form: NonEmergencyDispatchForm
  errors: DispatchFormErrors
  banadirRegionName: string
  districts: District[]
  hospitals: HospitalOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<NonEmergencyDispatchForm>) => void
  onCancel: () => void
  onSubmit: () => void
  submitting: boolean
}

export default function NonEmergencyDispatchFormView({
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
  const isFuneral = isFuneralTransport(form.transportType)
  const bookingBounds = getBookingDateTimeBounds(isFuneral)

  const handleTransportTypeChange = (transportType: string) => {
    const patch: Partial<NonEmergencyDispatchForm> = {
      transportType,
      transportTypeOther: '',
    }
    if (isFuneralTransport(transportType)) {
      patch.wheelchairNeeded = false
      patch.needsNurse = false
      patch.destinationHospitalBranchId = ''
      patch.destinationHospitalBranchName = ''
      if (form.patientName.trim().toUpperCase() === 'UNKNOWN') {
        patch.patientName = ''
      }
      if (form.bookingDateTime && !isBookingWithin24Hours(form.bookingDateTime)) {
        patch.bookingDateTime = ''
      }
    }
    onChange(patch)
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Non-Emergency Transport" icon={Truck} iconBg="bg-blue-100 text-blue-600">
        <p className="text-sm text-slate-600 mb-5">
          Scheduled or non-urgent medical transportation — appointments, discharges, and routine transfers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PatientNameField
            value={form.patientName}
            error={errors.patientName}
            onChange={(patientName) => onChange({ patientName })}
            label={isFuneral ? 'Relative Name' : 'Patient Name'}
            placeholder={isFuneral ? 'Full name of caller / relative' : 'Full name or UNKNOWN'}
            showUnknownButton={!isFuneral}
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
            <FieldLabel required error={errors.transportType}>Transport Type</FieldLabel>
            <select
              className={fieldInputClass(errors.transportType)}
              value={form.transportType}
              onChange={(e) => handleTransportTypeChange(e.target.value)}
            >
              <option value="">Select transport type</option>
              {DISPATCH_NON_EMERGENCY_TRANSPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {form.transportType === 'OTHER' && (
            <div className="sm:col-span-2">
              <FieldLabel required error={errors.transportTypeOther}>Describe transport type</FieldLabel>
              <input
                className={fieldInputClass(errors.transportTypeOther)}
                value={form.transportTypeOther}
                onChange={(e) => onChange({ transportTypeOther: e.target.value })}
              />
            </div>
          )}
          <div>
            <FieldLabel required>Pickup Region</FieldLabel>
            <input
              className={`${fieldInputClass()} bg-slate-100 text-slate-600 cursor-not-allowed`}
              value={banadirRegionName}
              readOnly
            />
          </div>
          <div>
            <FieldLabel required error={errors.districtId}>Pickup District</FieldLabel>
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
            <FieldLabel required error={errors.pickupAddress}>Pickup Address</FieldLabel>
            <input
              className={fieldInputClass(errors.pickupAddress)}
              value={form.pickupAddress}
              onChange={(e) => onChange({ pickupAddress: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <HospitalDestinationPicker
              combobox
              branchRequired={false}
              hideBranch={isFuneral}
              hospitals={hospitals}
              hospitalId={form.destinationHospitalId}
              hospitalName={form.destinationHospitalName}
              branchId={form.destinationHospitalBranchId}
              branchName={form.destinationHospitalBranchName}
              required
              hospitalError={errors.destinationHospitalId}
              branchError={errors.destinationHospitalBranchId}
              hospitalLabel={isFuneral ? 'Graveyard' : 'Destination Hospital or Place'}
              hospitalPlaceholder={
                isFuneral ? 'Type or select graveyard' : 'Type or select hospital or place'
              }
              onHospitalChange={(hospitalId, hospitalName, branchId, branchName) =>
                onChange({
                  destinationHospitalId: hospitalId,
                  destinationHospitalName: hospitalName,
                  destinationHospitalBranchId: isFuneral ? '' : branchId,
                  destinationHospitalBranchName: isFuneral ? '' : branchName,
                  destination: isFuneral ? hospitalName : branchName || hospitalName,
                })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required error={errors.bookingDateTime}>Booking Date & Time</FieldLabel>
            <input
              type="datetime-local"
              min={bookingBounds.min}
              max={bookingBounds.max}
              className={fieldInputClass(errors.bookingDateTime)}
              value={form.bookingDateTime}
              onChange={(e) => onChange({ bookingDateTime: e.target.value })}
            />
            {isFuneral && (
              <p className="mt-1.5 text-xs text-slate-500">
                Funeral bookings must be scheduled within the next 24 hours.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            {!isFuneral && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.wheelchairNeeded}
                  onChange={(e) => onChange({ wheelchairNeeded: e.target.checked })}
                  className="h-4 w-4 accent-blue-600"
                />
                Wheelchair needed
              </label>
            )}
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

      {!isFuneral && (
        <NurseRequiredField
          needsNurse={form.needsNurse}
          error={errors.needsNurse}
          onChange={(value) => onChange({ needsNurse: value })}
        />
      )}

      <FormActions
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitting={submitting}
        submitLabel="Submit Booking Request"
      />
    </div>
  )
}
