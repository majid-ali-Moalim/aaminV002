/** Somalia-style plate: 2 letters + 4 digits (e.g. AB0000) */
export const PLATE_NUMBER_PATTERN = /^[A-Z]{2}\d{4}$/

export function formatPlateInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let letters = ''
  let digits = ''
  for (const ch of cleaned) {
    if (letters.length < 2 && /[A-Z]/.test(ch)) {
      letters += ch
    } else if (letters.length === 2 && digits.length < 4 && /\d/.test(ch)) {
      digits += ch
    }
  }
  return letters + digits
}

export function isValidPlateNumber(value: string): boolean {
  return PLATE_NUMBER_PATTERN.test(value.trim().toUpperCase())
}
