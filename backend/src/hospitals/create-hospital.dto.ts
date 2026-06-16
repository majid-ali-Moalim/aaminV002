import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export const HOSPITAL_TYPES = [
  'General Hospital',
  'Women & Child Hospital',
  'Trauma Center',
  'Cardiac Center',
  'Clinic',
  'Specialized Hospital',
] as const;

export const OWNERSHIP_TYPES = ['Public', 'Private', 'NGO', 'Military'] as const;

export const OPERATIONAL_STATUSES = ['Active', 'Inactive', 'Maintenance'] as const;

export const CAPACITY_STATUSES = ['Available', 'Limited Capacity', 'Full Capacity'] as const;

export const HOSPITAL_STAFF_ROLES = [
  'Hospital Coordinator',
  'Emergency Coordinator',
  'Hospital Manager',
] as const;

export const ACCOUNT_STATUSES = ['Active', 'Suspended', 'Pending Activation'] as const;

export const MEDICAL_CAPABILITIES = [
  'General Care',
  'Emergency Department',
  'Trauma Care',
  'Surgery Support',
  'Women & Child Care',
  'Maternity Care',
  'Pediatric Care',
  'Cardiology Support',
  'Neurology Support',
  'ICU Capability',
  'Burn Treatment',
  'Blood Transfusion',
  'Orthopedic Care',
  'Dialysis Services',
  'Laboratory Services',
  'Radiology Services',
] as const;

export class CreateHospitalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn([...HOSPITAL_TYPES])
  hospitalType: string;

  @IsString()
  @IsIn([...OWNERSHIP_TYPES])
  ownershipType: string;

  @IsString()
  @IsNotEmpty()
  regionId: string;

  @IsString()
  @IsNotEmpty()
  districtId: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  contactPersonName: string;

  @IsString()
  @IsNotEmpty()
  contactPersonRole: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, { message: 'Primary phone must be a valid phone number' })
  primaryPhone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, { message: 'Secondary phone must be a valid phone number' })
  secondaryPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2,5}$/, { message: 'Emergency short code must be 2–5 digits (e.g. 999, 112)' })
  emergencyShortCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s\-()]{3,20}$/, { message: 'Emergency hotline must be a valid phone number (min 3 digits)' })
  emergencyHotline?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsBoolean()
  acceptEmergencyCases: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one medical capability must be selected' })
  @IsIn([...MEDICAL_CAPABILITIES], { each: true })
  medicalCapabilities: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  beds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  icuTotalBeds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  emergencyBeds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  operatingRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ambulanceReceptionCapacity?: number;

  @IsOptional()
  @IsString()
  @IsIn([...CAPACITY_STATUSES])
  capacityStatus?: string;

  @IsString()
  @IsIn([...OPERATIONAL_STATUSES])
  operationalStatus: string;

  @IsOptional()
  @IsBoolean()
  available24_7?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptAmbulanceTransfers?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptWalkInPatients?: boolean;

  /** Portal account */
  @IsString()
  @IsNotEmpty()
  accountUsername: string;

  @IsEmail()
  accountEmail: string;

  @IsString()
  @MinLength(8)
  accountPassword: string;

  @IsOptional()
  @IsString()
  @IsIn([...HOSPITAL_STAFF_ROLES])
  hospitalRole?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ACCOUNT_STATUSES])
  accountStatus?: string;

  @IsOptional()
  @IsBoolean()
  forcePasswordChange?: boolean;
}
