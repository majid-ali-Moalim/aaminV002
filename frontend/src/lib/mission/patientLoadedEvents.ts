export const PATIENT_LOADED_EVENT = 'aamin:patient-loaded'

export type PatientLoadedDetail = {
  missionId: string
}

export function dispatchPatientLoadedEvent(detail: PatientLoadedDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PATIENT_LOADED_EVENT, { detail }))
}

export function onPatientLoaded(handler: (detail: PatientLoadedDetail) => void) {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<PatientLoadedDetail>).detail
    if (detail?.missionId) handler(detail)
  }
  window.addEventListener(PATIENT_LOADED_EVENT, listener)
  return () => window.removeEventListener(PATIENT_LOADED_EVENT, listener)
}
