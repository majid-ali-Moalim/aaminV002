/** Basic RFC-style check for outbound mail (requires domain with a TLD). */
export function isValidEmailAddress(raw?: string | null): boolean {
  const email = String(raw ?? '').trim();
  if (!email) return false;
  if ((email.match(/@/g) ?? []).length !== 1) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Normalize login/email values for storage — never produces double-@ addresses. */
export function normalizeUserEmail(
  email?: string | null,
  username?: string | null,
  domain = 'aamin.so',
): string {
  const emailCandidate = String(email ?? '').trim();
  if (isValidEmailAddress(emailCandidate)) {
    return emailCandidate.toLowerCase();
  }

  const usernameCandidate = String(username ?? '').trim();
  if (isValidEmailAddress(usernameCandidate)) {
    return usernameCandidate.toLowerCase();
  }

  const localSource = usernameCandidate || emailCandidate;
  const safeLocal = localSource
    .replace(/@+/g, '.')
    .replace(/[^\w.\-+]/g, '')
    .replace(/^\.+|\.+$/g, '');

  return `${safeLocal || 'user'}@${domain}`.toLowerCase();
}

export function resolveDeliverableEmail(raw?: string | null): string | null {
  const email = String(raw ?? '').trim();
  return isValidEmailAddress(email) ? email.toLowerCase() : null;
}
