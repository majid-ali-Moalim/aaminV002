'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { emergencyRequestsService } from '@/lib/api'
import { parseCaseMessageParts } from '@/lib/dispatchCaseMessage'

function caseDetailPath(portal: 'admin' | 'dispatcher', caseId: string) {
  const base = portal === 'dispatcher' ? '/dispatcher/emergency-requests' : '/admin/emergency-requests'
  return `${base}/${caseId}`
}

export default function CaseLinkedMessageText({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const portal = pathname?.startsWith('/dispatcher') ? 'dispatcher' : 'admin'
  const parts = useMemo(() => parseCaseMessageParts(content), [content])

  const openByTrackingCode = async (trackingCode: string) => {
    try {
      const request = await emergencyRequestsService.getByTrackingCode(trackingCode)
      router.push(caseDetailPath(portal, request.id))
    } catch (err) {
      console.error('Failed to open case from tracking code', err)
    }
  }

  const linkClass =
    'font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer'

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <span key={index} className="whitespace-pre-wrap break-words">
              {part.value}
            </span>
          )
        }

        if (part.type === 'case') {
          return (
            <Link
              key={index}
              href={caseDetailPath(portal, part.caseId)}
              className={linkClass}
            >
              Case {part.trackingCode}
            </Link>
          )
        }

        return (
          <button
            key={index}
            type="button"
            onClick={() => openByTrackingCode(part.trackingCode)}
            className={`${linkClass} bg-transparent border-0 p-0 inline`}
          >
            Case {part.trackingCode}
          </button>
        )
      })}
    </p>
  )
}
