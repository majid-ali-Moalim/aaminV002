import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  email: string;
}
