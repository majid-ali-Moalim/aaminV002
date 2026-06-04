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

export const MEDICAL_CAPABILITIES = [
  'General Care',
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

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, { message: 'Emergency hotline must be a valid phone number' })
  emergencyHotline: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

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

  @IsString()
  @IsIn([...OPERATIONAL_STATUSES])
  operationalStatus: string;
}
