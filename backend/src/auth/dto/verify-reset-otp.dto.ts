import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyResetOtpDto {
  @IsEmail()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  email: string;

  @IsString()
  @Transform(({ value }) => String(value ?? '').replace(/\D/g, '').slice(0, 6))
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits.' })
  otp: string;
}
