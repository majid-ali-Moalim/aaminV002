'use client'

import Link from 'next/link'
import { MessageCircle, Radio, Star } from 'lucide-react'
import { buildCaseChatUrl, type ChatPortal } from '@/lib/dispatchCaseMessage'

type DispatcherInfo = {
  userId?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  user?: { id?: string; username?: string | null } | null
} | null | undefined

type Props = {
  dispatcher?: DispatcherInfo
  chatHref?: string
  caseId?: string
  trackingCode?: string
  portal?: ChatPortal
  variant?: 'driver' | 'nurse'
  layout?: 'row' | 'stack'
}

export function DispatcherContactActions({
  dispatcher,
  chatHref,
  caseId,
  trackingCode,
  portal = 'driver',
  variant = 'driver',
  layout = 'stack',
}: Props) {
  const name =
    dispatcher &&
    `${dispatcher.firstName || ''} ${dispatcher.lastName || ''}`.trim()
  const label = name || dispatcher?.user?.username || 'Assigned dispatcher'
  const dispatcherUserId = dispatcher?.userId ?? dispatcher?.user?.id ?? null

  const href =
    caseId && trackingCode
      ? buildCaseChatUrl(portal, {
          caseId,
          trackingCode,
          userId: dispatcherUserId,
        })
      : chatHref ?? `/${portal}/chat`

  const btnClass =
    variant === 'driver'
      ? 'driver-btn-sm ghost field-case-contact-btn'
      : 'nurse-btn ghost field-case-contact-btn'

  return (
    <div className={`field-case-contact-actions field-case-contact-actions--${layout}`}>
      <p className="field-case-dispatcher-label">
        <Star size={14} className="field-case-dispatcher-star" aria-hidden />
        <Radio size={14} /> Case dispatcher — {label}
      </p>
      <Link href={href} className={`${btnClass} field-case-contact-chat`}>
        <MessageCircle size={16} />
        <span>Chat Dispatcher</span>
      </Link>
    </div>
  )
}
