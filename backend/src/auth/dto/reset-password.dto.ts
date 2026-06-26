import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @IsEmail()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
