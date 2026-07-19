'use client'

import { MessageCircle, Phone } from 'lucide-react'
import { formatSomaliaPhoneDisplay, resolvePatientPhone, telHref, whatsappHref } from '@/lib/phoneContact'

type CaseLike = {
  trackingCode?: string
  patient?: { fullName?: string | null; phone?: string | null } | null
  callerName?: string | null
  callerPhone?: string | null
} | null | undefined

type Props = {
  caseData: CaseLike
  variant?: 'driver' | 'nurse'
}

export function PatientContactActions({ caseData, variant = 'driver' }: Props) {
  const patientName = caseData?.patient?.fullName || caseData?.callerName || 'Patient'
  const phone = resolvePatientPhone(caseData)
  const display = formatSomaliaPhoneDisplay(phone)
  const tel = telHref(phone)
  const whatsapp = whatsappHref(phone)

  const btnClass =
    variant === 'driver'
      ? 'driver-btn-sm ghost field-case-contact-btn'
      : 'nurse-btn ghost field-case-contact-btn'

  return (
    <div className="field-case-review-patient">
      <p className="field-case-detail-label">Patient</p>
      <p className="field-case-detail-value">{patientName}</p>
      <p className="field-case-detail-label mt-2">Patient phone (Somalia +252)</p>
      <p className="field-case-detail-value font-mono">{display || 'No phone on file'}</p>
      {(tel || whatsapp) && (
        <div className="field-case-contact-actions field-case-contact-actions--row mt-3">
          {tel && (
            <a href={tel} className={btnClass}>
              <Phone size={16} />
              <span>Call</span>
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btnClass}>
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
