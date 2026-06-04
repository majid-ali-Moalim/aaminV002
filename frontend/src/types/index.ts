export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  PATIENT = 'PATIENT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum BloodType {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
}

export enum NationalityType {
  LOCAL = 'LOCAL',
  INTERNATIONAL = 'INTERNATIONAL',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  UNKNOWN = 'UNKNOWN',
}

// Enums migrated to Master Data tables: EmployeeRole, IncidentCategory

export enum EmergencyRequestStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  DISPATCHED = 'DISPATCHED',
  ARRIVED_SCENE = 'ARRIVED_SCENE',
  TRANSPORTING = 'TRANSPORTING',
  ARRIVED_HOSPITAL = 'ARRIVED_HOSPITAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AmbulanceStatus {
  AVAILABLE = 'AVAILABLE',
  ON_DUTY = 'ON_DUTY',
  MAINTENANCE = 'MAINTENANCE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

// --- Master Data Interfaces ---

export interface Region {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface District {
  id: string;
  name: string;
  regionId: string;
  description?: string | null;
  isActive: boolean;
  region?: Region;
}

export interface Station {
  id: string;
  name: string;
  regionId: string;
  districtId: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  region?: Region;
  district?: District;
}

export interface Area {
  id: string;
  name: string;
  districtId: string;
  landmarkDescription?: string | null;
  directionNotes?: string | null;
  accessibilityLevel?: string | null;
  riskLevel?: string | null;
  isActive: boolean;
  district?: District;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface EmployeeRole {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface EquipmentLevel {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface IncidentCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status: string;

  employeeCode?: string | null;
  shiftStatus?: string | null;

  licenseNumber?: string | null;
  licenseType?: string | null;
  licenseClass?: string | null;
  licenseIssueDate?: string | null;
  licenseExpiryDate?: string | null;
  licenseStatus?: string | null;
  
  medicalFitness?: string | null;
  medicalCertificate?: string | null;
  medicalExpiry?: string | null;

  gender?: Gender | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  profilePhoto?: string | null;

  emergencyContactName?: string | null;
  emergencyPhone?: string | null;
  relationship?: string | null;
  address?: string | null;

  employmentDate?: string | null;
  typicalStartTime?: string | null;
  typicalEndTime?: string | null;
  defaultShift?: string | null;

  employeeRoleId?: string | null;
  departmentId?: string | null;
  stationId?: string | null;
  assignedAmbulanceId?: string | null;

  user?: User;
  employeeRole?: EmployeeRole | null;
  department?: Department | null;
  station?: Station | null;
  assignedAmbulance?: Ambulance | null;
  shiftRecords?: ShiftRecord[];
  attendanceRecords?: AttendanceRecord[];

  createdAt: string;
  updatedAt: string;
}

export interface Ambulance {
  id: string;
  ambulanceNumber: string;
  plateNumber: string;
  fleetNumber?: string | null;
  status: AmbulanceStatus;
  location?: string | null;
  
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleType?: string | null;
  vehicleYear?: number | null;

  regionId?: string | null;
  districtId?: string | null;
  stationId?: string | null;
  equipmentLevelId?: string | null;

  crewCount: number;
  readinessScore?: number | null;
  oxygenAvailable?: boolean;
  defibrillatorAvailable?: boolean;
  registrationExpiry?: string | null;
  registrationDocumentUrl?: string | null;
  isActive: boolean;
  
  fuelLevel?: number | null;
  mileage?: number | null;
  lastMaintenance?: string | null;
  nextMaintenance?: string | null;
  notes?: string | null;

  region?: Region | null;
  district?: District | null;
  station?: Station | null;
  equipmentLevel?: EquipmentLevel | null;

  employees?: Employee[];
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  patientCode: string;
  fullName: string;
  age?: number | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  phone: string;
  email?: string | null;
  address: string;

  regionId?: string | null;
  districtId?: string | null;

  bloodType?: BloodType | null;
  nationalityType?: NationalityType;
  country?: string | null;
  maritalStatus?: MaritalStatus;
  conditions?: string | null;
  allergies?: string | null;
  insuranceProvider?: string | null;
  isActive: boolean;

  region?: Region | null;
  district?: District | null;
  
  createdAt: string;
  updatedAt: string;

  // Derived properties from backend response
  totalEmergencies?: number;
  lastEmergencyDate?: string | null;
  lastAmbulanceNumber?: string | null;
  lastHospitalName?: string | null;
}

// Enum migrated to IncidentCategory table

export enum RequestSource {
  PHONE_CALL = 'PHONE_CALL',
  WALK_IN = 'WALK_IN',
  STAFF = 'STAFF',
  REFERRAL = 'REFERRAL',
  OTHER = 'OTHER'
}

export interface EmergencyStatusLog {
  id: string;
  emergencyRequestId: string;
  fromStatus?: EmergencyRequestStatus | null;
  toStatus: EmergencyRequestStatus;
  notes?: string | null;
  changedByEmployeeId?: string | null;
  createdAt: string;
  changedByEmployee?: Employee;
}

export interface EmergencyRequest {
  id: string;
  trackingCode: string;
  patientId: string;
  dispatcherId?: string | null;
  driverId?: string | null;
  ambulanceId?: string | null;

  incidentCategoryId?: string | null;
  regionId?: string | null;
  districtId?: string | null;

  status: EmergencyRequestStatus;
  priority: Priority;

  callerName?: string | null;
  callerPhone?: string | null;
  requestSource: RequestSource;

  pickupLocation: string;
  pickupLandmark?: string | null;
  destination?: string | null;
  destinationLandmark?: string | null;

  patientCondition?: string | null;
  symptoms?: string | null;
  consciousStatus?: string | null;
  breathingStatus?: string | null;
  bleedingStatus?: string | null;
  needsOxygen?: boolean;
  needsStretcher?: boolean;
  notes?: string | null;
  manualDispatchNotes?: string | null;

  assignedAt?: string | null;
  dispatchedAt?: string | null;
  arrivedAtSceneAt?: string | null;
  departedSceneAt?: string | null;
  arrivedDestinationAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;

  responseMinutes?: number | null;
  serviceMinutes?: number | null;
  cancellationReason?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  patient?: Patient;
  dispatcher?: Employee;
  driver?: Employee;
  ambulance?: Ambulance;
  incidentCategory?: IncidentCategory | null;
  region?: Region | null;
  district?: District | null;
  statusLogs?: EmergencyStatusLog[];
  referrals?: any[]; 
}

export interface ShiftRecord {
  id: string;
  employeeId: string;
  status: string;
  startTime: string;
  endTime?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
