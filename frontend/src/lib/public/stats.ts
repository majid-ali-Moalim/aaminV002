export interface PublicStats {
  emergencyCalls: number
  ambulances: number
  medicalStaff: number
  drivers: number
  nurses: number
  completedCases: number
  avgResponseTimeMinutes: number | null
  updatedAt: string
}

export const EMPTY_PUBLIC_STATS: PublicStats = {
  emergencyCalls: 0,
  ambulances: 0,
  medicalStaff: 0,
  drivers: 0,
  nurses: 0,
  completedCases: 0,
  avgResponseTimeMinutes: null,
  updatedAt: new Date(0).toISOString(),
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://127.0.0.1:3001'

export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    const res = await fetch(`${API_BASE}/api/public/stats`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return EMPTY_PUBLIC_STATS
    return (await res.json()) as PublicStats
  } catch {
    return EMPTY_PUBLIC_STATS
  }
}

export function formatPublicCount(value: number): string {
  return value.toLocaleString('en-US')
}

export function formatResponseTimeMinutes(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  return `${minutes}min`
}

export function formatResponseTimeLabel(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return 'Live dispatch metrics'
  return `Avg ${minutes} min response`
}
