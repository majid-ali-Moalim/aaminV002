import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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
