const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

/** Resolve stored upload path or relative URL to a browser-loadable image URL. */
export function profilePhotoUrl(path?: string | null): string {
  if (!path?.trim()) return ''
  const value = path.trim()
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/')) return `${API_BASE}${value}`
  return `${API_BASE}/${value}`
}

export function getEmployeeInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'
}
