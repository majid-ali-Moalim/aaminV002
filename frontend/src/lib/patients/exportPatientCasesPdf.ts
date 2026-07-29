import type { EmergencyRequest } from '@/types'
import { emergencyRequestsService } from '@/lib/api'
import { downloadPatientCasesDossierPdf } from '@/lib/reports/exportPdf'
import {
  buildCareRecordsTable,
  buildCaseSummaryStats,
  buildCasesOverviewTable,
  buildCrewSection,
  buildIntakeSection,
  buildMissionSection,
  buildPatientCasesFilterScope,
  buildPatientRelativeSection,
  buildTimelineTable,
  buildTimingSection,
  type PatientCasesPdfFilters,
} from '@/lib/patients/patientCasePdfBuilders'

async function enrichCasesForPdf(cases: EmergencyRequest[]): Promise<EmergencyRequest[]> {
  const enriched = await Promise.all(
    cases.map(async (req) => {
      try {
        return (await emergencyRequestsService.getById(req.id)) as EmergencyRequest
      } catch {
        return req
      }
    }),
  )
  return enriched
}

export async function downloadPatientCasesReportPdf(
  cases: EmergencyRequest[],
  filters: PatientCasesPdfFilters,
) {
  if (!cases.length) {
    throw new Error('No cases to export')
  }

  const enriched = await enrichCasesForPdf(cases)
  const scope = buildPatientCasesFilterScope(filters, enriched.length)

  const dossierCases = enriched.map((req) => ({
    trackingCode: req.trackingCode,
    patientRelative: buildPatientRelativeSection(req),
    mission: buildMissionSection(req),
    crew: buildCrewSection(req),
    intake: buildIntakeSection(req),
    timing: buildTimingSection(req),
    timeline: buildTimelineTable(req),
    careRecords: buildCareRecordsTable(req),
  }))

  const stamp = new Date().toISOString().slice(0, 10)

  await downloadPatientCasesDossierPdf(
    {
      title: scope.isFiltered ? 'Patient Cases — Filtered Dossier' : 'Patient Cases — Full Dossier',
      subtitle: scope.filterDescription,
      scopeNote: scope.scopeNote,
      summary: buildCaseSummaryStats(enriched),
      overviewTable: buildCasesOverviewTable(enriched),
      cases: dossierCases,
    },
    `patient-cases-${scope.isFiltered ? 'filtered' : 'full'}-${stamp}.pdf`,
  )
}
