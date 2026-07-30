import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export const PASSWORD_POLICY_MESSAGE =
  'Password must meet minimum length and include uppercase, lowercase, a number, and a special character.';

const PASSWORD_COMPLEXITY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

export function assertPasswordMeetsPolicy(password: string, minLength = 8): void {
  const min = Math.max(6, Math.min(32, minLength));
  if (password.length < min || !PASSWORD_COMPLEXITY.test(password)) {
    throw new BadRequestException('Password does not meet security requirements.');
  }
}

export function passwordPolicyMessage(minLength = 8): string {
  const min = Math.max(6, Math.min(32, minLength));
  return `Password must be at least ${min} characters and include uppercase, lowercase, a number, and a special character.`;
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b;
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Strip spaces/dashes and keep exactly 6 digits. */
export function normalizeOtpCode(otp: string): string {
  const digits = String(otp ?? '').replace(/\D/g, '');
  return digits.length === 6 ? digits : '';
}

export function hashOtpForStorage(otp: string): string {
  const normalized = normalizeOtpCode(otp);
  if (!normalized) {
    throw new BadRequestException('Invalid verification code format.');
  }
  return crypto.createHash('sha256').update(`aamin-reset:${normalized}`).digest('hex');
}

/** Supports legacy bcrypt hashes and current SHA-256 hashes. */
export async function verifyStoredOtp(
  otp: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash) return false;
  const normalized = normalizeOtpCode(otp);
  if (!normalized) return false;

  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(normalized, storedHash);
  }

  return hashOtpForStorage(normalized) === storedHash;
}
