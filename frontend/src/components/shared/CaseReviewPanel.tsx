'use client'

import { ClipboardCheck } from 'lucide-react'
import { PatientContactActions } from '@/components/shared/PatientContactActions'

type CaseLike = {
  trackingCode?: string
  patient?: { fullName?: string | null; phone?: string | null } | null
  callerName?: string | null
  callerPhone?: string | null
  pickupLocation?: string | null
  patientCondition?: string | null
} | null | undefined

type Props = {
  caseData: CaseLike
  variant?: 'driver' | 'nurse'
  onConfirm: () => void
}

export function CaseReviewPanel({ caseData, variant = 'driver', onConfirm }: Props) {
  const btnClass = variant === 'driver' ? 'driver-btn-sm primary w-full' : 'nurse-btn primary w-full'

  return (
    <div className="field-case-review-panel">
      <div className="field-case-review-head">
        <ClipboardCheck size={20} />
        <div>
          <h4>Review case before starting</h4>
          <p>Confirm the patient details and contact number before any workflow action.</p>
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
