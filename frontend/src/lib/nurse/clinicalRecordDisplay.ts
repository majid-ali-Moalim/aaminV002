import {
  findLatestAssessmentRecord,
  findLatestHandoverRecord,
  handoverOutcomeLabel,
  parseClinicalRecord,
  parseHandover,
} from '@/lib/nurse/patientCareTypes'

export type CaseFileField = { label: string; value: string }

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
  nurse?: { firstName?: string | null; lastName?: string | null } | null
}

function nurseLabel(record: CareRecord): string {
  return [record.nurse?.firstName, record.nurse?.lastName].filter(Boolean).join(' ') || 'Nurse'
}

function pushField(fields: CaseFileField[], label: string, value?: string | number | null) {
  const v = value != null ? String(value).trim() : ''
  if (!v || v === '—') return
  fields.push({ label, value: v })
}

function isPlaceholderText(value?: string | null): boolean {
  if (!value?.trim()) return true
  const v = value.trim()
  return v === 'Chief complaint *' || v === 'Treatment given' || v === 'Notes'
}

function parseFreeTextFromClinicalNotes(clinicalNotes?: string | null): {
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

/** Latest assessment + handover only — no raw JSON, no duplicate load-patient rows. */
export function buildCaseFileClinicalBlocks(records: CareRecord[]): CaseFileClinicalBlock[] {
  const blocks: CaseFileClinicalBlock[] = []

  const assessmentRecord = findLatestAssessmentRecord(records)
  if (assessmentRecord) {
    const assessment = parseClinicalRecord(assessmentRecord.clinicalNotes)
    const extras = parseFreeTextFromClinicalNotes(assessmentRecord.clinicalNotes)
    const fields: CaseFileField[] = []

    if (assessment && !isPlaceholderText(assessment.chiefComplaint)) {
      pushField(fields, 'Chief complaint', assessment.chiefComplaint)
    }
    if (assessment?.consciousnessLevel) {
      pushField(fields, 'Consciousness', assessment.consciousnessLevel)
    }
    if (assessment?.breathingStatus) {
      pushField(fields, 'Breathing', assessment.breathingStatus)
    }
    pushField(fields, 'Blood pressure', assessmentRecord.bloodPressure)
    pushField(fields, 'Pulse', assessmentRecord.heartRate)
    pushField(fields, 'SpO₂', assessmentRecord.oxygenSaturation)
    pushField(fields, 'Treatment', assessmentRecord.treatmentGiven)
    pushField(fields, 'Medication', assessmentRecord.medications)
    if (!isPlaceholderText(extras.treatmentNotes)) {
      pushField(fields, 'Treatment notes', extras.treatmentNotes)
    }
    if (extras.observations) {
      pushField(fields, 'Notes', extras.observations)
    }

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
    const handover = parseHandover(handoverRecord.clinicalNotes)
    if (handover) {
      const fields: CaseFileField[] = []
      pushField(fields, 'Hospital', handover.acceptedHospital)
      pushField(fields, 'Patient status', handoverOutcomeLabel(handover.patientOutcome))
      pushField(fields, 'Condition at handover', handover.patientCondition)
      pushField(fields, 'Treatment en route', handover.treatmentGiven)
      pushField(fields, 'Receiving doctor', handover.receivingStaff)
      pushField(fields, 'Handover notes', handover.notes)
      pushField(fields, 'Nurse signature', handover.signature)
      if (handover.rejectedHospitals?.length) {
        const rejected = handover.rejectedHospitals
          .filter((r) => r.hospitalName?.trim())
          .map((r) => r.hospitalName.trim())
          .join(', ')
        pushField(fields, 'Rejected hospitals', rejected)
      }

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
