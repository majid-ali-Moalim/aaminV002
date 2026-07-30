import type { EmergencyRequest } from '@/types'

export interface DispatchCaseMessageContext {
  caseId: string
  trackingCode: string
  dispatcherUserId?: string | null
}

const CASE_TOKEN_RE = /\[\[case:([^:\]]+):([^\]]+)\]\]/g

export type CaseMessagePart =
  | { type: 'text'; value: string }
  | { type: 'case'; caseId: string; trackingCode: string }
  | { type: 'casePlain'; trackingCode: string }

/** Machine-readable case marker stored in chat (rendered as a clickable case link). */
export function encodeCaseRef(caseId: string, trackingCode: string): string {
  return `[[case:${caseId.trim()}:${trackingCode.trim()}]]`
}

/** Prepend a case marker before the admin's message when sending from dispatch context. */
export function ensureCasePrefix(content: string, trackingCode: string, caseId: string): string {
  const trimmed = content.trim()
  const code = trackingCode.trim()
  const id = caseId.trim()
  if (!code || !id) return trimmed
  if (trimmed.includes(`[[case:${id}:`)) return trimmed

  const token = encodeCaseRef(id, code)
  if (!trimmed) return token
  return `${token} ${trimmed}`
}

/** Human-readable preview for contact lists (hide internal case tokens). */
export function formatCaseMessagePreview(content: string): string {
  return content.replace(CASE_TOKEN_RE, (_, _id: string, code: string) => `Case ${code}`)
}

function splitPlainCaseText(text: string): CaseMessagePart[] {
  if (!text) return []
  const parts: CaseMessagePart[] = []
  const plainRe = /Case\s+([A-Za-z0-9][A-Za-z0-9-]*)/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = plainRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'casePlain', trackingCode: match[1] })
    lastIndex = plainRe.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  } else if (lastIndex === 0) {
    parts.push({ type: 'text', value: text })
  }

  return parts
}

export function parseCaseMessageParts(content: string): CaseMessagePart[] {
  if (!content) return []

  const parts: CaseMessagePart[] = []
  const tokenRe = new RegExp(CASE_TOKEN_RE.source, 'g')
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...splitPlainCaseText(content.slice(lastIndex, match.index)))
    }
    parts.push({ type: 'case', caseId: match[1], trackingCode: match[2] })
    lastIndex = tokenRe.lastIndex
  }

  if (lastIndex < content.length) {
    parts.push(...splitPlainCaseText(content.slice(lastIndex)))
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }]
}

export function buildDispatchChatUrl(dispatch: EmergencyRequest): string {
  return buildCaseChatUrl('admin', {
    caseId: dispatch.id,
    trackingCode: dispatch.trackingCode,
    userId: dispatch.dispatcher?.userId,
  })
}

export type ChatPortal = 'admin' | 'driver' | 'nurse' | 'dispatcher'

export function buildCaseChatUrl(
  portal: ChatPortal,
  params: { caseId: string; trackingCode: string; userId?: string | null },
): string {
  const search = new URLSearchParams()
  search.set('caseId', params.caseId)
  search.set('trackingCode', params.trackingCode)
  if (params.userId) search.set('userId', params.userId)
  return `/${portal}/chat?${search.toString()}`
}

export function chatBasePathFromPathname(pathname: string | null): string {
  if (pathname?.startsWith('/driver')) return '/driver/chat'
  if (pathname?.startsWith('/nurse')) return '/nurse/chat'
  if (pathname?.startsWith('/dispatcher')) return '/dispatcher/chat'
  return '/admin/chat'
}

export function parseDispatchCaseFromSearchParams(
  params: URLSearchParams,
): DispatchCaseMessageContext | null {
  const caseId = params.get('caseId')?.trim()
  const trackingCode = params.get('trackingCode')?.trim()
  if (!caseId || !trackingCode) return null
  const userId = params.get('userId')?.trim()
  return {
    caseId,
    trackingCode,
    dispatcherUserId: userId || null,
  }
}
