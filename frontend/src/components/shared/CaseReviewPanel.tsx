'use client'

import { ClipboardCheck } from 'lucide-react'
import { PatientContactActions } from '@/components/shared/PatientContactActions'
import { formatBookingLabel, parseBookingDateTimeFromNotes } from '@/lib/emergency/bookingTime'

type CaseLike = {
  trackingCode?: string
  patient?: { fullName?: string | null; phone?: string | null } | null
  callerName?: string | null
  callerPhone?: string | null
  pickupLocation?: string | null
  patientCondition?: string | null
  destination?: string | null
  destinationHospital?: { name?: string | null } | null
  destinationHospitalBranchName?: string | null
  notes?: string | null
  needsStretcher?: boolean | null
} | null | undefined

function notesFlag(notes: string | null | undefined, label: string): boolean {
  if (!notes) return false
  return new RegExp(`^${label}:\\s*Yes`, 'im').test(notes)
}

type Props = {
  caseData: CaseLike
  variant?: 'driver' | 'nurse'
  onConfirm: () => void
}

export function CaseReviewPanel({ caseData, variant = 'driver', onConfirm }: Props) {
  const btnClass = variant === 'driver' ? 'driver-btn-sm primary w-full' : 'nurse-btn primary w-full'
  const hospitalName =
    caseData?.destinationHospital?.name ||
    caseData?.destination ||
    null
  const branchName = caseData?.destinationHospitalBranchName || null
  const wheelchair = notesFlag(caseData?.notes, 'Wheelchair Needed')
  const stretcher = caseData?.needsStretcher || notesFlag(caseData?.notes, 'Stretcher Needed')
  const bookingLabel = formatBookingLabel(caseData?.notes)
  const bookingAt = parseBookingDateTimeFromNotes(caseData?.notes)

  return (
    <div className="field-case-review-panel">
      <div className="field-case-review-head">
        <ClipboardCheck size={20} />
        <div>
          <h4>Review case before starting</h4>
          <p>Confirm patient details, destination, equipment, and booking time before any workflow action.</p>
        </div>
      </div>
      <div className="field-case-review-body">
        <p className="field-case-detail-label">Case number</p>
        <p className="field-case-detail-value font-mono text-lg">{caseData?.trackingCode || '—'}</p>
        <PatientContactActions caseData={caseData} variant={variant} />
        {caseData?.pickupLocation && (
          <>
            <p className="field-case-detail-label mt-3">Pickup</p>
            <p className="field-case-detail-value">{caseData.pickupLocation}</p>
          </>
        )}
        {hospitalName && (
          <>
            <p className="field-case-detail-label mt-3">Destination hospital</p>
            <p className="field-case-detail-value">{hospitalName}</p>
          </>
        )}
        {branchName && (
          <>
            <p className="field-case-detail-label mt-3">Branch / location</p>
            <p className="field-case-detail-value">{branchName}</p>
          </>
        )}
        {(wheelchair || stretcher) && (
          <>
            <p className="field-case-detail-label mt-3">Equipment</p>
            <p className="field-case-detail-value">
              {[wheelchair ? 'Wheelchair needed' : null, stretcher ? 'Stretcher needed' : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          </>
        )}
        {bookingLabel && (
          <>
            <p className="field-case-detail-label mt-3">Booking</p>
            <p className="field-case-detail-value">
              {bookingLabel}
              {bookingAt && bookingAt.getTime() > Date.now() + 60_000 && (
                <span className="block text-xs text-amber-700 mt-1 font-semibold">
                  Scheduled — do not start until booking time unless dispatch confirms.
                </span>
              )}
            </p>
          </>
        )}
        {caseData?.patientCondition && (
          <>
            <p className="field-case-detail-label mt-3">Condition</p>
            <p className="field-case-detail-value">{caseData.patientCondition}</p>
          </>
        )}
      </div>
      <button type="button" className={btnClass} onClick={onConfirm}>
        I have reviewed this case — continue
      </button>
    </div>
  )
}
