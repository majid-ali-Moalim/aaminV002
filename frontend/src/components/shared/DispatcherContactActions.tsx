'use client'

import Link from 'next/link'
import { MessageCircle, Radio } from 'lucide-react'

type DispatcherInfo = {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  user?: { username?: string | null } | null
} | null | undefined

type Props = {
  dispatcher?: DispatcherInfo
  chatHref: string
  variant?: 'driver' | 'nurse'
  layout?: 'row' | 'stack'
}

export function DispatcherContactActions({
  dispatcher,
  chatHref,
  variant = 'driver',
  layout = 'stack',
}: Props) {
  const name =
    dispatcher &&
    `${dispatcher.firstName || ''} ${dispatcher.lastName || ''}`.trim()
  const label = name || dispatcher?.user?.username || 'Assigned dispatcher'

  const btnClass =
    variant === 'driver'
      ? 'driver-btn-sm ghost field-case-contact-btn'
      : 'nurse-btn ghost field-case-contact-btn'

  return (
    <div className={`field-case-contact-actions field-case-contact-actions--${layout}`}>
      <p className="field-case-dispatcher-label">
        <Radio size={14} /> Contact dispatcher — {label}
      </p>
      <Link href={chatHref} className={`${btnClass} field-case-contact-chat`}>
        <MessageCircle size={16} />
        <span>Chat Dispatcher</span>
      </Link>
    </div>
  )
}
