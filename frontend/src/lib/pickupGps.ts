export type PickupGpsFields = {
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  pickupLocation?: string | null
  notes?: string | null
}

export function parseGpsFromText(text?: string | null): { lat: number; lng: number } | null {
  if (!text) return null
  const match = text.match(/GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i)
  if (!match) return null
  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

function hasStoredGpsFields(
  request: PickupGpsFields,
): request is PickupGpsFields & { pickupLatitude: number; pickupLongitude: number } {
  const lat = request.pickupLatitude
  const lng = request.pickupLongitude
  return (
    lat != null &&
    lng != null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/** DB fields first, then parse from pickupLocation / notes (legacy requests). */
export function resolvePickupGps(request: PickupGpsFields | null | undefined): {
  lat: number
  lng: number
} | null {
  if (!request) return null
  if (hasStoredGpsFields(request)) {
    return { lat: request.pickupLatitude, lng: request.pickupLongitude }
  }
  return (
    parseGpsFromText(request.pickupLocation) ||
    parseGpsFromText(request.notes) ||
    null
  )
}

export function hasPickupGps(request: PickupGpsFields | null | undefined): boolean {
  return resolvePickupGps(request) !== null
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function formatPickupCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export async function copyPickupGpsLink(lat: number, lng: number): Promise<void> {
  const url = googleMapsUrl(lat, lng)
  const text = `Pickup location: ${formatPickupCoords(lat, lng)}\n${url}`
  await navigator.clipboard.writeText(text)
}
