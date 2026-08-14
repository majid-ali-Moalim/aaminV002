export function extractTrackingCode(text: string): string | null {
  const match =
    text.match(/CASE[-\s]?\d{4}-\d+/i) ||
    text.match(/\b[A-Z]{2,10}-\d{4}-\d+\b/i) ||
    text.match(/\b[A-Z]{2,}-\d+\b/i)
  return match ? match[0].toUpperCase().replace(/\s+/g, '-') : null
}
