import type { EmergencyRequest, Patient } from '@/types'
import { emergencyRequestsService } from '@/lib/api'
import { downloadPatientRegistryDossierPdf } from '@/lib/reports/exportPdf'
import {
  buildPatientCaseHistoryTable,
  buildPatientProfileSection,
  buildPatientRegistryFilterScope,
  buildRegistryOverviewTable,
  buildRegistrySummaryStats,
  type PatientRegistryPdfFilters,
} from '@/lib/patients/patientRegistryPdfBuilders'

export async function downloadPatientRegistryReportPdf(
  patients: Patient[],
  filters: PatientRegistryPdfFilters,
) {
  if (!patients.length) {
    throw new Error('No patients to export')
  }

  let allCases: EmergencyRequest[] = []
  try {
    allCases = (await emergencyRequestsService.getAll()) as EmergencyRequest[]
  } catch {
    allCases = []
  }

  const scope = buildPatientRegistryFilterScope(filters, patients.length)
  const dossierPatients = patients.map((patient) => ({
    patientCode: patient.patientCode,
    profile: buildPatientProfileSection(patient),
    caseHistory: buildPatientCaseHistoryTable(patient.id, allCases),
  }))

  const stamp = new Date().toISOString().slice(0, 10)

  await downloadPatientRegistryDossierPdf(
    {
      title: scope.isFiltered
        ? 'Patient Registry — Filtered Report'
        : 'Patient Registry — Full Report',
      subtitle: scope.filterDescription,
      scopeNote: scope.scopeNote,
      summary: buildRegistrySummaryStats(patients),
      overviewTable: buildRegistryOverviewTable(patients),
      patients: dossierPatients,
    },
    `patient-registry-${scope.isFiltered ? 'filtered' : 'full'}-${stamp}.pdf`,
  )
}
