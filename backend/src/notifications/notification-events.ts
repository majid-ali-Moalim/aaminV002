import { NotificationCategory, NotificationPriority, NotificationType } from '@prisma/client';

export type NotificationEventKey =
  | 'STAFF_REGISTERED'
  | 'STAFF_UPDATED'
  | 'STAFF_SUSPENDED'
  | 'STAFF_REACTIVATED'
  | 'EMERGENCY_CREATED'
  | 'EMERGENCY_ESCALATED'
  | 'MISSION_ASSIGNED'
  | 'MISSION_REASSIGNED'
  | 'MISSION_UPDATED'
  | 'MISSION_COMPLETED'
  | 'MISSION_CANCELLED'
  | 'MISSION_DELAYED'
  | 'HOSPITAL_RESPONSE'
  | 'INCIDENT_REPORT'
  | 'SYSTEM_ALERT'
  | 'SECURITY_ALERT'
  | 'EMERGENCY_BROADCAST'
  | 'COMMUNICATION_MESSAGE'
  | 'SHIFT_REMINDER'
  | 'CASE_STATION_TRANSFER'
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

export type DispatchContext = {
  createdById?: string | null;
  recipientUserIds?: string[];
  assignedUserIds?: string[];
  includeEmployeeRoles?: string[];
  directOnly?: boolean;
  regionId?: string | null;
  stationId?: string | null;
};

export type DispatchPayload = {
  eventKey: NotificationEventKey;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  senderName?: string;
  entityType?: string;
  entityId?: string;
  redirectUrl?: string;
  context?: DispatchContext;
};

export const EVENT_ROLE_ACCESS: Record<
  NotificationEventKey,
  {
    includeUserRoles: ('ADMIN' | 'EMPLOYEE')[];
    employeeRoleNames?: string[];
    excludeEmployeeRoleNames?: string[];
  }
> = {
  STAFF_REGISTERED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator', 'HR Manager', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
  },
  STAFF_UPDATED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator', 'HR Manager', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
  },
  STAFF_SUSPENDED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator', 'HR Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
  },
  STAFF_REACTIVATED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator', 'HR Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
  },
  EMERGENCY_CREATED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse'],
  },
  EMERGENCY_ESCALATED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse'],
  },
  MISSION_ASSIGNED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator'],
    excludeEmployeeRoleNames: [],
  },
  MISSION_REASSIGNED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  MISSION_UPDATED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: ['Dispatcher'],
  },
  MISSION_COMPLETED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse'],
  },
  MISSION_CANCELLED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  MISSION_DELAYED: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator'],
    excludeEmployeeRoleNames: [],
  },
  HOSPITAL_RESPONSE: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher', 'Administrator'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse'],
  },
  INCIDENT_REPORT: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator', 'Operations Manager'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
  },
  SYSTEM_ALERT: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator'],
    excludeEmployeeRoleNames: [],
  },
  SECURITY_ALERT: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Administrator'],
    excludeEmployeeRoleNames: [],
  },
  EMERGENCY_BROADCAST: {
    includeUserRoles: ['ADMIN', 'EMPLOYEE'],
    employeeRoleNames: ['Driver', 'Nurse', 'Dispatcher', 'Administrator', 'Operations Manager'],
    excludeEmployeeRoleNames: [],
  },
  COMMUNICATION_MESSAGE: {
    includeUserRoles: ['ADMIN', 'EMPLOYEE'],
    employeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
    excludeEmployeeRoleNames: [],
  },
  SHIFT_REMINDER: {
    includeUserRoles: ['EMPLOYEE'],
    employeeRoleNames: ['Driver', 'Nurse', 'Dispatcher'],
    excludeEmployeeRoleNames: [],
  },
  CASE_STATION_TRANSFER: {
    includeUserRoles: ['ADMIN'],
    employeeRoleNames: ['Dispatcher'],
    excludeEmployeeRoleNames: ['Driver', 'Nurse'],
  },
  NEW_EMERGENCY_REQUEST: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  CREW_ASSIGNED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  CASE_STARTED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  ARRIVED_SCENE: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  PATIENT_LOADED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  MEDICAL_NOTES_COMPLETED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  EN_ROUTE_HOSPITAL: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  ARRIVED_HOSPITAL: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  HANDOVER_COMPLETED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
  CASE_COMPLETED: {
    includeUserRoles: [],
    employeeRoleNames: [],
    excludeEmployeeRoleNames: [],
  },
};
