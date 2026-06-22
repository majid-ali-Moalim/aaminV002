export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export type PasswordRequirementKey =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'special';

export type PasswordRequirement = {
  key: PasswordRequirementKey;
  label: string;
  met: boolean;
};

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'minLength', label: 'Minimum 8 characters', met: password.length >= 8 },
    { key: 'uppercase', label: 'At least 1 uppercase letter', met: /[A-Z]/.test(password) },
    { key: 'lowercase', label: 'At least 1 lowercase letter', met: /[a-z]/.test(password) },
    { key: 'number', label: 'At least 1 number', met: /\d/.test(password) },
    {
      key: 'special',
      label: 'At least 1 special character',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty';
  const reqs = getPasswordRequirements(password);
  const metCount = reqs.filter((r) => r.met).length;
  if (metCount <= 2) return 'weak';
  if (metCount === 3) return 'fair';
  if (metCount === 4) return 'good';
  return 'strong';
}

export function validateChangePasswordForm(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.currentPassword.trim()) {
    errors.currentPassword = 'Current password is required.';
  }

  if (!input.newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (!passwordMeetsPolicy(input.newPassword)) {
    errors.newPassword = 'Password does not meet security requirements.';
  } else if (
    input.currentPassword &&
    input.newPassword === input.currentPassword
  ) {
    errors.newPassword = 'New password cannot be the same as your current password.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (input.newPassword && input.confirmPassword !== input.newPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validateResetPasswordForm(input: {
  password: string;
  confirmPassword: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.password) {
    errors.password = 'New password is required.';
  } else if (!passwordMeetsPolicy(input.password)) {
    errors.password = 'Password does not meet security requirements.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (input.password && input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
