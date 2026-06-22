import { BadRequestException } from '@nestjs/common';

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function assertPasswordMeetsPolicy(password: string): void {
  if (!PASSWORD_REGEX.test(password)) {
    throw new BadRequestException('Password does not meet security requirements.');
  }
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b;
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
