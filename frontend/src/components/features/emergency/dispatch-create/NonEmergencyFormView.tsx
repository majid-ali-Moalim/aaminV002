'use client'

import { Truck } from 'lucide-react'
import { isFuneralTransport, isBookingWithin24Hours, getBookingDateTimeBounds } from '@/lib/emergency/dispatchFormShared'
import { isOtherTransportType, type TransportTypeOption } from '@/lib/emergency/transportTypes'
import type { District } from '@/types'
import StationAssignmentField from '@/components/features/emergency/StationAssignmentField'
import PatientNameField from './PatientNameField'
import PatientDemographicsFields from './PatientDemographicsFields'
import { FieldLabel, fieldInputClass, FormActions, SectionCard, phoneDigitsOnly } from './ui'
import NurseRequiredField from './NurseRequiredField'
import HospitalDestinationPicker, { type HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'
import type { CustomHospitalDraft } from '@/components/hospitals/CustomHospitalModal'
import type { DispatchFormErrors, NonEmergencyDispatchForm } from './types'

type Props = {
  form: NonEmergencyDispatchForm
  errors: DispatchFormErrors
  banadirRegionName: string
  districts: District[]
  hospitals: HospitalOption[]
  transportTypes: TransportTypeOption[]
  loadingDistricts: boolean
  onChange: (patch: Partial<NonEmergencyDispatchForm>) => void
  onCreateCustomHospital?: (draft: CustomHospitalDraft) => Promise<HospitalOption | null>
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
  transportTypes,
  loadingDistricts,
  onChange,
  onCreateCustomHospital,
  onCancel,
  onSubmit,
  submitting,
}: Props) {
  const isFuneral = isFuneralTransport(form.transportType)
  const selectedTransport = transportTypes.find(
    (t) => (t.code || '').toUpperCase() === form.transportType.toUpperCase(),
  )
  const showOtherTransport = selectedTransport
    ? isOtherTransportType(selectedTransport)
    : form.transportType === 'OTHER'
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
            placeholder={isFuneral ? 'Full name of caller / relative' : 'Patient full name'}
            showUnknownButton={false}
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
            {transportTypes.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                No transport types configured. Add them in Admin → Master Data → Mission
                Configuration → Transport Types.
              </p>
            ) : (
              <select
                className={fieldInputClass(errors.transportType)}
                value={form.transportType}
                onChange={(e) => handleTransportTypeChange(e.target.value)}
              >
                <option value="">Select transport type</option>
                {transportTypes.map((t) => (
                  <option key={t.id} value={t.code || t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            {transportTypes.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                Options loaded from Master Data → Mission Configuration
              </p>
            )}
          </div>
          {showOtherTransport && (
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
              onCreateCustomHospital={isFuneral ? undefined : onCreateCustomHospital}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required={!form.bookNow} error={errors.bookingDateTime}>Booking Date & Time</FieldLabel>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={form.bookNow}
                onChange={(e) => {
                  const bookNow = e.target.checked
                  onChange({
                    bookNow,
                    bookingDateTime: bookNow
                      ? new Date().toISOString().slice(0, 16)
                      : form.bookingDateTime,
                  })
                }}
                className="h-4 w-4 accent-blue-600"
              />
              Book now (immediate dispatch window)
            </label>
            <input
              type="datetime-local"
              min={bookingBounds.min}
              max={bookingBounds.max}
              className={fieldInputClass(errors.bookingDateTime)}
              value={form.bookingDateTime}
              disabled={form.bookNow}
              onChange={(e) => onChange({ bookingDateTime: e.target.value, bookNow: false })}
            />
            {form.bookNow && (
              <p className="mt-1.5 text-xs text-emerald-700">
                Crew can be assigned immediately. A reminder is sent when the booking time is reached.
              </p>
            )}
            {isFuneral && !form.bookNow && (
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
