export type EmergencyPortal = 'admin' | 'dispatcher'

export function emergencyPortalPaths(portal: EmergencyPortal = 'admin') {
  const base =
    portal === 'dispatcher' ? '/dispatcher/emergency-requests' : '/admin/emergency-requests'

  return {
    base,
    all: base,
    new: `${base}/new`,
    critical: `${base}/critical`,
    escalated: `${base}/escalated`,
    pending: `${base}/pending`,
    triage: `${base}/triage`,
    active: `${base}/active`,
    enRoute: `${base}/en-route`,
    transporting: `${base}/transporting`,
    atHospital: `${base}/at-hospital`,
    handover: `${base}/handover`,
    completed: `${base}/completed`,
    cancelled: `${base}/cancelled`,
    dispatchBoard:
      portal === 'dispatcher' ? `${base}/pending` : '/admin/dashboard/live',
    caseDetail: (id: string) => `${base}/${id}`,
    caseTimeline: (id: string) => `${base}/timeline/${id}`,
    caseTrack: (id: string) => `${base}/track/${id}`,
    patientsCases:
      portal === 'dispatcher' ? '/dispatcher/patients/cases' : '/admin/patients/cases',
  }
}
