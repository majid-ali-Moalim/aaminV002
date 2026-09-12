/** Parse booking datetime from non-emergency case notes. */
export function parseBookingDateTimeFromNotes(notes?: string | null): Date | null {
  if (!notes) return null
  const bookingLine = notes
    .split('\n')
    .find((line) => /^Booking:\s*/i.test(line.trim()))
  if (!bookingLine) return null
  const raw = bookingLine.replace(/^Booking:\s*/i, '').trim()
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isNonEmergencyCase(notes?: string | null, patientCondition?: string | null): boolean {
  const blob = `${notes ?? ''}\n${patientCondition ?? ''}`.toLowerCase()
  return blob.includes('non-emergency') || blob.includes('request type: non-emergency')
}

export function isBookNowCase(notes?: string | null): boolean {
  return Boolean(notes?.split('\n').some((line) => /^Book Now:\s*Yes/i.test(line.trim())))
}

/** Case is scheduled for a future booking time (not book-now). */
export function isScheduledFutureCase(notes?: string | null): boolean {
  if (isBookNowCase(notes)) return false
  const booking = parseBookingDateTimeFromNotes(notes)
  if (!booking) return false
  return booking.getTime() > Date.now() + 60_000
}

export function formatBookingLabel(notes?: string | null): string | null {
  if (isBookNowCase(notes)) return 'Book now'
  const booking = parseBookingDateTimeFromNotes(notes)
  if (!booking) return null
  return booking.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
