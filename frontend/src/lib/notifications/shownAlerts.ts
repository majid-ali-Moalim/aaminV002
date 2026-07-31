const STORAGE_KEY = 'aamin_shown_notification_ids'
const MAX_IDS = 500

function readIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function hasNotificationBeenShown(id: string): boolean {
  if (!id) return false
  return readIds().includes(id)
}

export function markNotificationShown(id: string): void {
  if (typeof window === 'undefined' || !id) return
  const ids = readIds().filter((existing) => existing !== id)
  ids.push(id)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_IDS)))
}
