import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { HOSPITAL_TYPES } from '../../hospitals/create-hospital.dto';

export class ManualAssignHospitalDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @IsString()
  @IsNotEmpty()
  districtId!: string;

  @IsOptional()
  @IsString()
  @IsIn([...HOSPITAL_TYPES])
  hospitalType?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  branchAddress?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-()]{7,20}$/, { message: 'Primary phone must be a valid phone number' })
  primaryPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s\-()]{3,20}$/, { message: 'Emergency hotline must be a valid phone number' })
  emergencyHotline?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2,5}$/, { message: 'Emergency short code must be 2–5 digits' })
  emergencyShortCode?: string;

  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @IsOptional()
  @IsString()
  contactPersonRole?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receivingStaffName?: string;
}
