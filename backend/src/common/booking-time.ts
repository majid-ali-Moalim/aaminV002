export function parseBookingDateTimeFromNotes(notes?: string | null): Date | null {
  if (!notes) return null;
  const bookingLine = notes
    .split('\n')
    .find((line) => /^Booking:\s*/i.test(line.trim()));
  if (!bookingLine) return null;
  const raw = bookingLine.replace(/^Booking:\s*/i, '').trim();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isNonEmergencyCase(notes?: string | null, patientCondition?: string | null): boolean {
  const blob = `${notes ?? ''}\n${patientCondition ?? ''}`.toLowerCase();
  return blob.includes('non-emergency') || blob.includes('request type: non-emergency');
}

export function isBookNowCase(notes?: string | null): boolean {
  return Boolean(notes?.split('\n').some((line) => /^Book Now:\s*Yes/i.test(line.trim())));
}

export function isScheduledFutureCase(notes?: string | null): boolean {
  if (isBookNowCase(notes)) return false;
  const booking = parseBookingDateTimeFromNotes(notes);
  if (!booking) return false;
  return booking.getTime() > Date.now() + 60_000;
}

export function assertCaseReadyForAssignment(notes?: string | null): void {
  if (!isScheduledFutureCase(notes)) return;
  const booking = parseBookingDateTimeFromNotes(notes);
  const label = booking?.toISOString() ?? 'scheduled time';
  throw new Error(`SCHEDULED:${label}`);
}
