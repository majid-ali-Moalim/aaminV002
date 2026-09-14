const HANDOVER_PREFIX = '[EADS_HANDOVER]';
const ASSESSMENT_PREFIX = '[EADS_ASSESSMENT]';
const MONITORING_PREFIX = '[EADS_MONITORING]';

export type HandoverEmailPayload = {
  patientName?: string;
  patientCondition?: string;
  treatmentGiven?: string;
  receivingStaff?: string;
  notes?: string;
  signature?: string;
  patientOutcome?: string;
  acceptedHospital?: string;
  rejectedHospitals?: Array<{
    hospitalName: string;
    reason: string;
    notes?: string;
    branchName?: string;
    phone?: string;
    location?: string;
  }>;
  category?: string;
  incidentCategoryName?: string;
  hospitalNotifyEmail?: string;
  driverName?: string;
  nurseName?: string;
  ageGroup?: string;
  gender?: string;
  nationalityType?: string;
  maritalStatus?: string;
  handoverDocumentUrl?: string;
  handoverDocumentName?: string;
};

export type HandoverEmailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export function parseHandoverEmailPayload(clinicalNotes: string): HandoverEmailPayload | null {
  if (!clinicalNotes.startsWith(HANDOVER_PREFIX)) return null;
  try {
    return JSON.parse(clinicalNotes.slice(HANDOVER_PREFIX.length)) as HandoverEmailPayload;
  } catch {
    return null;
  }
}

function parsePrefixedJson<T>(notes: string | null | undefined, prefix: string): T | null {
  if (!notes?.startsWith(prefix)) return null;
  try {
    return JSON.parse(notes.slice(prefix.length)) as T;
  } catch {
    return null;
  }
}

function handoverOutcomeLabel(value?: string | null): string {
  if (!value) return '—';
  if (value === 'Deceased' || value === 'Dead') return 'Dead';
  if (value === 'Live') return 'Live';
  if (value === 'Unknown') return 'Unknown';
  return value;
}

function employeeName(emp?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!emp) return '';
  return `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
}

function formatDateTime(d?: Date | null) {
  if (!d) return '';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function row(label: string, value?: string | null): { label: string; value: string } | null {
  const v = value?.trim();
  if (!v) return null;
  return { label, value: v };
}

function rows(...entries: Array<{ label: string; value: string } | null>): Array<{ label: string; value: string }> {
  return entries.filter(Boolean) as Array<{ label: string; value: string }>;
}

export function buildHandoverEmailSections(input: {
  handover: HandoverEmailPayload;
  request: {
    trackingCode: string;
    priority: string;
    status: string;
    requestSource?: string | null;
    callerName?: string | null;
    callerPhone?: string | null;
    pickupLocation?: string | null;
    pickupLandmark?: string | null;
    destination?: string | null;
    destinationHospitalBranchName?: string | null;
    symptoms?: string | null;
    patientCondition?: string | null;
    consciousStatus?: string | null;
    breathingStatus?: string | null;
    bleedingStatus?: string | null;
    notes?: string | null;
    manualDispatchNotes?: string | null;
    createdAt?: Date;
    dispatchedAt?: Date | null;
    arrivedAtSceneAt?: Date | null;
    arrivedDestinationAt?: Date | null;
    region?: { name?: string | null } | null;
    district?: { name?: string | null } | null;
    incidentCategory?: { name?: string | null } | null;
    destinationHospital?: { name?: string | null; primaryPhone?: string | null; email?: string | null } | null;
    ambulance?: { ambulanceNumber?: string | null; plateNumber?: string | null } | null;
    driver?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
    nurse?: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
    patient?: {
      fullName?: string | null;
      phone?: string | null;
      age?: number | null;
      gender?: string | null;
    } | null;
  };
  careRecords: Array<{
    clinicalNotes?: string | null;
    bloodPressure?: string | null;
    heartRate?: number | null;
    oxygenSaturation?: number | null;
    temperature?: number | null;
    respiratoryRate?: number | null;
    medications?: string | null;
    treatmentGiven?: string | null;
    createdAt?: Date;
  }>;
  handoverRecordedAt?: Date;
  documentUrl?: string;
}): HandoverEmailSection[] {
  const { handover, request, careRecords } = input;
  const patientName = handover.patientName || request.patient?.fullName || 'Unknown';

  const assessmentRecord = careRecords.find((r) => r.clinicalNotes?.includes(ASSESSMENT_PREFIX));
  const monitoringRecord = careRecords.find((r) => r.clinicalNotes?.includes(MONITORING_PREFIX));
  const assessment = parsePrefixedJson<{
    chiefComplaint?: string;
    symptoms?: string;
    consciousnessLevel?: string;
    painLevel?: string;
    breathingStatus?: string;
    injuryDescription?: string;
    assessmentNotes?: string;
  }>(assessmentRecord?.clinicalNotes ?? null, ASSESSMENT_PREFIX);
  const monitoring = parsePrefixedJson<{
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    oxygenSaturation?: string;
    respiratoryRate?: string;
    condition?: string;
    notes?: string;
  }>(monitoringRecord?.clinicalNotes ?? null, MONITORING_PREFIX);

  const vitalsSource = monitoringRecord ?? assessmentRecord;
  const bp = monitoring?.bloodPressure || vitalsSource?.bloodPressure;
  const hr = monitoring?.heartRate || vitalsSource?.heartRate?.toString();
  const spo2 = monitoring?.oxygenSaturation || vitalsSource?.oxygenSaturation?.toString();
  const temp = monitoring?.temperature || vitalsSource?.temperature?.toString();
  const rr = monitoring?.respiratoryRate || vitalsSource?.respiratoryRate?.toString();

  const rejectedRows =
    handover.rejectedHospitals
      ?.filter((r) => r.hospitalName?.trim())
      .map((r, i) =>
        row(
          `Rejected ${i + 1}`,
          [
            r.hospitalName,
            r.branchName ? `Branch: ${r.branchName}` : '',
            r.location ? `Location: ${r.location}` : '',
            r.phone ? `Phone: ${r.phone}` : '',
            `Reason: ${r.reason || 'Not specified'}`,
            r.notes ? `Notes: ${r.notes}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        ),
      )
      .filter(Boolean) ?? [];

  const incidentCategory =
    handover.incidentCategoryName || request.incidentCategory?.name || undefined;

  const acceptingHospital =
    handover.acceptedHospital ||
    request.destinationHospital?.name ||
    request.destination ||
    request.destinationHospitalBranchName ||
    undefined;

  const sections: HandoverEmailSection[] = [
    {
      title: 'Case & dispatch',
      rows: rows(
        row('Tracking code', request.trackingCode),
        row('Priority', request.priority),
        row('Case status', request.status?.replace(/_/g, ' ')),
        row('Request source', request.requestSource?.replace(/_/g, ' ')),
        row('Case opened', formatDateTime(request.createdAt)),
        row('Dispatched', formatDateTime(request.dispatchedAt)),
        row('Arrived scene', formatDateTime(request.arrivedAtSceneAt)),
        row('Arrived destination', formatDateTime(request.arrivedDestinationAt)),
        row('Handover recorded', formatDateTime(input.handoverRecordedAt)),
      ),
    },
    {
      title: 'Patient information',
      rows: rows(
        row('Patient name', patientName),
        row('Phone', request.patient?.phone || request.callerPhone),
        row('Age group', handover.ageGroup),
        row('Patient age', request.patient?.age != null ? String(request.patient.age) : undefined),
        row('Gender', handover.gender || request.patient?.gender || undefined),
        row('Nationality', handover.nationalityType),
        row('Marital status', handover.maritalStatus),
        row('Caller name', request.callerName),
        row('Caller phone', request.callerPhone),
      ),
    },
    {
      title: 'Incident & presentation',
      rows: rows(
        row('Incident category', incidentCategory),
        row('Symptoms / complaint', assessment?.chiefComplaint || assessment?.symptoms || request.symptoms),
        row('Injury description', assessment?.injuryDescription),
        row('Consciousness (dispatch)', request.consciousStatus),
        row('Breathing (dispatch)', request.breathingStatus),
        row('Bleeding (dispatch)', request.bleedingStatus),
        row('Consciousness (assessment)', assessment?.consciousnessLevel),
        row('Breathing (assessment)', assessment?.breathingStatus),
        row('Pain level', assessment?.painLevel),
        row('Assessment notes', assessment?.assessmentNotes),
      ),
    },
    {
      title: 'Locations',
      rows: rows(
        row('Pickup location', request.pickupLocation),
        row('Pickup landmark', request.pickupLandmark),
        row('Region / district', [request.region?.name, request.district?.name].filter(Boolean).join(' / ') || undefined),
        row('Accepting hospital', acceptingHospital),
        row('Hospital branch', request.destinationHospitalBranchName || undefined),
        row('Hospital phone', request.destinationHospital?.primaryPhone),
      ),
    },
    {
      title: 'Handover summary',
      rows: rows(
        row('Handover category', handover.category),
        row('Patient status at handover', handoverOutcomeLabel(handover.patientOutcome)),
        row('Condition summary', handover.patientCondition || request.patientCondition),
        row('Treatment given en route', handover.treatmentGiven || vitalsSource?.treatmentGiven || undefined),
        row('Medications', vitalsSource?.medications || undefined),
        row('Receiving doctor / staff', handover.receivingStaff),
        row('Monitoring condition', monitoring?.condition),
        row('Monitoring notes', monitoring?.notes),
        row('Handover notes', handover.notes),
        row('Dispatcher notes', request.notes),
        row('Dispatch manual notes', request.manualDispatchNotes),
        row('Digital signature', handover.signature),
      ),
    },
    {
      title: 'Vitals at handover (latest recorded)',
      rows: rows(
        row('Blood pressure', bp),
        row('Heart rate', hr ? `${hr} bpm` : undefined),
        row('SpO₂', spo2 ? `${spo2}%` : undefined),
        row('Temperature', temp ? `${temp} °C` : undefined),
        row('Respiratory rate', rr ? `${rr} /min` : undefined),
      ),
    },
    {
      title: 'Field team',
      rows: rows(
        row('Ambulance', request.ambulance?.ambulanceNumber || request.ambulance?.plateNumber),
        row('Driver', handover.driverName || employeeName(request.driver)),
        row('Driver phone', request.driver?.phone),
        row('Handover nurse', handover.nurseName || employeeName(request.nurse)),
        row('Nurse phone', request.nurse?.phone),
      ),
    },
  ];

  if (rejectedRows.length) {
    sections.push({
      title: 'Previously rejected hospitals',
      rows: rejectedRows as Array<{ label: string; value: string }>,
    });
  }

  if (input.documentUrl) {
    sections.push({
      title: 'Attachments',
      rows: rows(
        row(
          handover.handoverDocumentName || 'Handover document',
          input.documentUrl,
        ),
      ),
    });
  }

  return sections.filter((s) => s.rows.length > 0);
}

export function buildHandoverEmailPlainText(sections: HandoverEmailSection[]): string {
  const lines = [
    'Aamin Ambulance — Patient handover notification',
    'Please prepare to receive the following patient. Full handover details are below.',
    '',
  ];
  for (const section of sections) {
    lines.push(`── ${section.title.toUpperCase()} ──`);
    for (const { label, value } of section.rows) {
      lines.push(`${label}: ${value}`);
    }
    lines.push('');
  }
  lines.push('—');
  lines.push('This message was generated automatically from the nurse hospital handover form.');
  return lines.join('\n');
}
