import {
  findLatestAssessmentRecord,
  findLatestHandoverRecord,
  handoverOutcomeLabel,
  parseClinicalRecord,
  parseHandover,
  parseLoadPatient,
  parseMonitoring,
} from '@/lib/nurse/patientCareTypes'
import { formatGender } from '@/lib/patients/patientDisplay'
import { isImageUpload, uploadedFileUrl } from '@/lib/uploads/fileUrl'

export type CaseFileField = {
  label: string
  value: string
  /** Absolute URL when the value is a downloadable attachment. */
  href?: string
  /** Attachment is an image that can be previewed inline. */
  isImage?: boolean
}

export type CaseFileClinicalBlock = {
  id: string
  title: string
  nurseName: string
  createdAt: string
  fields: CaseFileField[]
}

type CareRecord = {
  id: string
  createdAt?: string | Date
  clinicalNotes?: string | null
  bloodPressure?: string | null
  heartRate?: string | number | null
  temperature?: string | number | null
  oxygenSaturation?: string | number | null
  respiratoryRate?: string | number | null
  treatmentGiven?: string | null
  medications?: string | null
  activityLabel?: string | null
  nurse?: { firstName?: string | null; lastName?: string | null } | null
}

function nurseLabel(record: CareRecord): string {
  return [record.nurse?.firstName, record.nurse?.lastName].filter(Boolean).join(' ') || 'Nurse'
}

export function pushField(fields: CaseFileField[], label: string, value?: string | number | null) {
  const v = value != null ? String(value).trim() : ''
  if (!v || v === '—') return
  fields.push({ label, value: v })
}

function isPlaceholderText(value?: string | null): boolean {
  if (!value?.trim()) return true
  const v = value.trim()
  return v === 'Chief complaint *' || v === 'Treatment given' || v === 'Notes'
}

export function parseFreeTextFromClinicalNotes(clinicalNotes?: string | null): {
  observations: string
  treatmentNotes: string
} {
  if (!clinicalNotes) return { observations: '', treatmentNotes: '' }
  const parts = clinicalNotes.split('\n\n').filter(Boolean)
  const human = parts.filter((p) => !p.startsWith('[EADS_'))
  const treatmentPart = human.find((p) => p.startsWith('Treatment notes:'))
  const observations = human.filter((p) => !p.startsWith('Treatment notes:')).join('\n\n').trim()
  return {
    observations,
    treatmentNotes: treatmentPart?.replace(/^Treatment notes:\s*/, '').trim() ?? '',
  }
}

export function buildMedicalNotesFields(record: CareRecord): CaseFileField[] {
  const assessment = parseClinicalRecord(record.clinicalNotes)
  const extras = parseFreeTextFromClinicalNotes(record.clinicalNotes)
  const fields: CaseFileField[] = []

  if (assessment && !isPlaceholderText(assessment.chiefComplaint)) {
    pushField(fields, 'Chief complaint', assessment.chiefComplaint)
  }
  if (assessment?.symptoms && !isPlaceholderText(assessment.symptoms)) {
    pushField(fields, 'Symptoms', assessment.symptoms)
  }
  if (assessment?.consciousnessLevel) {
    pushField(fields, 'Consciousness', assessment.consciousnessLevel)
  }
  if (assessment?.painLevel) {
    pushField(fields, 'Pain level', assessment.painLevel)
  }
  if (assessment?.breathingStatus) {
    pushField(fields, 'Breathing', assessment.breathingStatus)
  }
  if (assessment?.injuryDescription && !isPlaceholderText(assessment.injuryDescription)) {
    pushField(fields, 'Injury description', assessment.injuryDescription)
  }
  if (assessment?.assessmentNotes && !isPlaceholderText(assessment.assessmentNotes)) {
    pushField(fields, 'Assessment notes', assessment.assessmentNotes)
  }
  pushField(fields, 'Blood pressure', record.bloodPressure)
  pushField(fields, 'Pulse', record.heartRate)
  pushField(fields, 'Respiratory rate', record.respiratoryRate)
  pushField(fields, 'Temperature', record.temperature)
  pushField(fields, 'SpO₂', record.oxygenSaturation)
  if (record.treatmentGiven && !isPlaceholderText(record.treatmentGiven)) {
    pushField(fields, 'Treatment', record.treatmentGiven)
  }
  pushField(fields, 'Medication', record.medications)
  if (!isPlaceholderText(extras.treatmentNotes)) {
    pushField(fields, 'Treatment notes', extras.treatmentNotes)
  }
  if (extras.observations) {
    pushField(fields, 'Notes', extras.observations)
  }

  return fields
}

export function buildHandoverFields(record: CareRecord): CaseFileField[] {
  const handover = parseHandover(record.clinicalNotes)
  if (!handover) return []

  const fields: CaseFileField[] = []
  pushField(fields, 'Hospital', handover.acceptedHospital)
  pushField(fields, 'Patient status', handoverOutcomeLabel(handover.patientOutcome))
  pushField(fields, 'Condition at handover', handover.patientCondition)
  if (handover.treatmentGiven && !isPlaceholderText(handover.treatmentGiven)) {
    pushField(fields, 'Treatment en route', handover.treatmentGiven)
  }
  pushField(fields, 'Receiving doctor', handover.receivingStaff)
  pushField(fields, 'Handover notes', handover.notes)
  pushField(fields, 'Nurse signature', handover.signature)
  if (handover.handoverDocumentUrl) {
    fields.push({
      label: 'Handover document',
      value: handover.handoverDocumentName || 'Uploaded document',
      href: uploadedFileUrl(handover.handoverDocumentUrl),
      isImage: isImageUpload(handover.handoverDocumentName || handover.handoverDocumentUrl),
    })
  }
  if (handover.rejectedHospitals?.length) {
    const rejected = handover.rejectedHospitals
      .filter((r) => r.hospitalName?.trim())
      .map((r) => {
        const parts = [r.hospitalName.trim()]
        if (r.branchName?.trim()) parts.push(`branch: ${r.branchName.trim()}`)
        if (r.location?.trim()) parts.push(`loc: ${r.location.trim()}`)
        if (r.phone?.trim()) parts.push(`tel: ${r.phone.trim()}`)
        if (r.reason?.trim()) parts.push(`(${r.reason.trim()})`)
        if (r.notes?.trim()) parts.push(`— ${r.notes.trim()}`)
        return parts.join(' ')
      })
      .join('; ')
    pushField(fields, 'Rejected hospitals', rejected)
  }
  pushField(fields, 'Age group', handover.ageGroup)
  pushField(fields, 'Gender', handover.gender ? formatGender(handover.gender as 'MALE' | 'FEMALE') : '')
  pushField(fields, 'Driver', handover.driverName)
  pushField(fields, 'Nurse', handover.nurseName)
  return fields
}

export function buildLoadPatientFields(record: CareRecord): CaseFileField[] {
  const loadData = parseLoadPatient(record.clinicalNotes)
  const fields: CaseFileField[] = []
  if (loadData?.loadedAt) {
    pushField(fields, 'Loaded at', new Date(loadData.loadedAt).toLocaleString())
  }
  if (loadData?.notes?.trim()) {
    pushField(fields, 'Notes', loadData.notes)
  }
  return fields
}

export function buildMonitoringFields(record: CareRecord): CaseFileField[] {
  const monitoring = parseMonitoring(record.clinicalNotes)
  if (!monitoring) return []
  const fields: CaseFileField[] = []
  pushField(fields, 'Blood pressure', monitoring.bloodPressure ?? record.bloodPressure)
  pushField(fields, 'Pulse', monitoring.heartRate ?? record.heartRate)
  pushField(fields, 'Temperature', monitoring.temperature ?? record.temperature)
  pushField(fields, 'SpO₂', monitoring.oxygenSaturation ?? record.oxygenSaturation)
  pushField(fields, 'Respiratory rate', monitoring.respiratoryRate ?? record.respiratoryRate)
  pushField(fields, 'Condition', monitoring.condition)
  pushField(fields, 'Notes', monitoring.notes)
  return fields
}

/** Latest assessment + handover only — no raw JSON, no duplicate load-patient rows. */
export function buildCaseFileClinicalBlocks(records: CareRecord[]): CaseFileClinicalBlock[] {
  const blocks: CaseFileClinicalBlock[] = []

  const assessmentRecord = findLatestAssessmentRecord(records)
  if (assessmentRecord) {
    const fields = buildMedicalNotesFields(assessmentRecord)
    if (fields.length > 0) {
      blocks.push({
        id: assessmentRecord.id,
        title: 'Medical notes',
        nurseName: nurseLabel(assessmentRecord),
        createdAt: String(assessmentRecord.createdAt ?? ''),
        fields,
      })
    }
  }

  const handoverRecord = findLatestHandoverRecord(records)
  if (handoverRecord) {
    const fields = buildHandoverFields(handoverRecord)
    if (fields.length > 0) {
      blocks.push({
        id: handoverRecord.id,
        title: 'Hospital handover',
        nurseName: nurseLabel(handoverRecord),
        createdAt: String(handoverRecord.createdAt ?? ''),
        fields,
      })
    }
  }

  return blocks
}
