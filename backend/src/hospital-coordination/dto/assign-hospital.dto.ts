import { HospitalRefusalReason } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AssignHospitalDto {
  @IsNotEmpty()
  @IsString()
  hospitalId!: string;

  @IsIn(['ACCEPTED', 'REJECTED'])
  outcome!: 'ACCEPTED' | 'REJECTED';

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  receivingStaffName?: string;

  @ValidateIf((dto: AssignHospitalDto) => dto.outcome === 'REJECTED')
  @IsEnum(HospitalRefusalReason)
  reason?: HospitalRefusalReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
