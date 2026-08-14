import { EmergencyRequestStatus, NotificationPriority } from '@prisma/client';

/** Canonical case workflow notification events (centralized — do not scatter strings). */
export type CaseWorkflowEvent =
  | 'NEW_EMERGENCY_REQUEST'
  | 'CREW_ASSIGNED'
  | 'CASE_STARTED'
  | 'ARRIVED_SCENE'
  | 'PATIENT_LOADED'
  | 'MEDICAL_NOTES_COMPLETED'
  | 'EN_ROUTE_HOSPITAL'
  | 'ARRIVED_HOSPITAL'
  | 'HANDOVER_COMPLETED'
  | 'CASE_COMPLETED';

export type CaseNotificationContext = {
  caseId: string;
  trackingCode: string;
  priority: NotificationPriority;
  stationId?: string | null;
  regionId?: string | null;
  driverUserId?: string | null;
  nurseUserId?: string | null;
  dispatcherUserId?: string | null;
};

export type CaseNotificationContent = {
  title: string;
  message: string;
  desktopTitle: string;
  desktopBody: string;
  priority: NotificationPriority;
};

/** Map status transitions to workflow events (only statuses that have dedicated notifications). */
export function statusToCaseWorkflowEvent(
  status: EmergencyRequestStatus,
): CaseWorkflowEvent | null {
  switch (status) {
    case 'DISPATCHED':
      return 'CASE_STARTED';
    case 'ARRIVED_SCENE':
      return 'ARRIVED_SCENE';
    case 'TRANSPORTING':
      return 'EN_ROUTE_HOSPITAL';
    case 'ARRIVED_HOSPITAL':
      return 'ARRIVED_HOSPITAL';
    case 'COMPLETED':
      return 'CASE_COMPLETED';
    default:
      return null;
  }
}

export function buildCaseNotificationContent(
  event: CaseWorkflowEvent,
  trackingCode: string,
  casePriority?: NotificationPriority,
): CaseNotificationContent {
  const code = trackingCode || 'Case';
  const critical = casePriority === 'CRITICAL';

  const templates: Record<CaseWorkflowEvent, CaseNotificationContent> = {
    NEW_EMERGENCY_REQUEST: {
      title: 'New Emergency Request',
      message: `A new ${critical ? 'critical ' : ''}emergency request has been received. ${code}`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `New ${critical ? 'Critical ' : ''}Emergency — ${code}`,
      priority: critical ? 'CRITICAL' : 'HIGH',
    },
    CREW_ASSIGNED: {
      title: 'New Mission Assigned',
      message: `Crew assigned to ${code}.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Mission Assigned — ${code}`,
      priority: critical ? 'CRITICAL' : 'HIGH',
    },
    CASE_STARTED: {
      title: 'Case Started',
      message: `Mission ${code} has started.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Case Started — ${code}`,
      priority: 'HIGH',
    },
    ARRIVED_SCENE: {
      title: 'Arrived at Scene',
      message: `Ambulance arrived at scene for ${code}.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Arrived at Scene — ${code}`,
      priority: 'HIGH',
    },
    PATIENT_LOADED: {
      title: 'Patient Loaded',
      message: `Patient loaded for ${code}. Transport may proceed.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Patient Loaded — ${code}`,
      priority: 'HIGH',
    },
    MEDICAL_NOTES_COMPLETED: {
      title: 'Medical Notes Completed',
      message: `Medical notes completed for ${code}.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Medical Notes Done — ${code}`,
      priority: 'MEDIUM',
    },
    EN_ROUTE_HOSPITAL: {
      title: 'En Route to Hospital',
      message: `${code} is en route to hospital.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `En Route to Hospital — ${code}`,
      priority: 'HIGH',
    },
    ARRIVED_HOSPITAL: {
      title: 'Arrived at Hospital',
      message: `${code} has arrived at the hospital.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Arrived at Hospital — ${code}`,
      priority: 'HIGH',
    },
    HANDOVER_COMPLETED: {
      title: 'Handover Completed',
      message: `Hospital handover completed for ${code}.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Handover Completed — ${code}`,
      priority: 'HIGH',
    },
    CASE_COMPLETED: {
      title: 'Case Completed',
      message: `Mission ${code} has been completed.`,
      desktopTitle: 'Aamin Ambulance',
      desktopBody: `Case Completed — ${code}`,
      priority: 'HIGH',
    },
  };

  return templates[event];
}

/**
 * Role-based recipient rules per spec.
 * Uses assigned driver/nurse/dispatcher on the case — never broadcasts to all field staff.
 */
export function resolveCaseEventRecipientUserIds(
  event: CaseWorkflowEvent,
  ctx: CaseNotificationContext,
  adminUserIds: string[],
  stationDispatcherUserIds: string[],
): string[] {
  const admin = adminUserIds.filter(Boolean);
  const dispatcher = ctx.dispatcherUserId
    ? [ctx.dispatcherUserId]
    : stationDispatcherUserIds.filter(Boolean);
  const driver = ctx.driverUserId ? [ctx.driverUserId] : [];
  const nurse = ctx.nurseUserId ? [ctx.nurseUserId] : [];

  let ids: string[] = [];

  switch (event) {
    case 'NEW_EMERGENCY_REQUEST':
      ids = [...dispatcher, ...admin];
      break;
    case 'CREW_ASSIGNED':
      ids = [...driver, ...nurse, ...dispatcher, ...admin];
      break;
    case 'CASE_STARTED':
      ids = [...nurse, ...dispatcher, ...admin];
      break;
    case 'ARRIVED_SCENE':
      ids = [...nurse, ...dispatcher, ...admin];
      break;
    case 'PATIENT_LOADED':
      ids = [...driver, ...dispatcher, ...admin];
      break;
    case 'MEDICAL_NOTES_COMPLETED':
      ids = [...dispatcher, ...admin];
      break;
    case 'EN_ROUTE_HOSPITAL':
      ids = [...dispatcher, ...admin];
      break;
    case 'ARRIVED_HOSPITAL':
      ids = [...nurse, ...dispatcher, ...admin];
      break;
    case 'HANDOVER_COMPLETED':
      ids = [...driver, ...dispatcher, ...admin];
      break;
    case 'CASE_COMPLETED':
      ids = [...driver, ...nurse, ...dispatcher, ...admin];
      break;
    default:
      ids = [];
  }

  return [...new Set(ids.filter(Boolean))];
}
