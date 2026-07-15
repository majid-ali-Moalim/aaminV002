import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CAPACITY_STATUSES,
  HOSPITAL_TYPES,
  MEDICAL_CAPABILITIES,
  OPERATIONAL_STATUSES,
  OWNERSHIP_TYPES,
} from './create-hospital.dto';

export class HospitalBranchDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  regionId: string;

  @IsString()
  @IsNotEmpty()
  districtId: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[\d\s\-()]{7,20}$/)
  primaryPhone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2,5}$/)
  emergencyShortCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s\-()]{3,20}$/)
  emergencyHotline?: string;
}

/** Hospital registration — facility info and branches only (no portal credentials). */
export class RegisterHospitalInfoDto {
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
  @Matches(/^\+?[\d\s\-()]{7,20}$/)
  primaryPhone: string;

  @IsOptional()
  @IsString()
  secondaryPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2,5}$/)
  emergencyShortCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s\-()]{3,20}$/)
  emergencyHotline?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsBoolean()
  acceptEmergencyCases?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn([...MEDICAL_CAPABILITIES], { each: true })
  medicalCapabilities?: string[];

  @IsOptional()
  @IsString()
  @IsIn([...OPERATIONAL_STATUSES])
  operationalStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn([...CAPACITY_STATUSES])
  capacityStatus?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HospitalBranchDto)
  branches: HospitalBranchDto[];
}
