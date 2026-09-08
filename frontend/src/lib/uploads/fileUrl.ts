const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

/** Resolve a stored upload path to a browser-loadable absolute URL. */
export function uploadedFileUrl(path?: string | null): string {
  const value = path?.trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return value.startsWith('/') ? `${API_BASE}${value}` : `${API_BASE}/${value}`
}

/** True when the upload is an image we can preview inline. */
export function isImageUpload(pathOrName?: string | null): boolean {
  const value = pathOrName?.trim().toLowerCase() ?? ''
  if (!value) return false
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(value)
}

/**
 * Save an upload to disk under its original filename.
 * Uploads live on the API origin, where the `download` attribute is ignored,
 * so the file is fetched as a blob first. Falls back to opening in a new tab.
 */
export async function downloadUploadedFile(
  path?: string | null,
  filename?: string | null,
): Promise<boolean> {
  const url = uploadedFileUrl(path)
  if (!url) return false

  const name = filename?.trim() || url.split('/').pop() || 'download'

  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) throw new Error(`Request failed with ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    return true
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
    return false
  }
}
