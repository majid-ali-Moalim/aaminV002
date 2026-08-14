'use client'

import Link from 'next/link'
import { Phone, Siren } from 'lucide-react'
import { AAMIN_CONTACT } from './homeContent'

export default function StickyEmergencyCall() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] md:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <Link
          href="/hire-ambulance"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm"
        >
          <Siren className="h-4 w-4" />
          Request
        </Link>
        <a
          href={`tel:${AAMIN_CONTACT.emergencyTel}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-white px-4 py-3 text-sm font-bold text-red-700"
        >
          <Phone className="h-4 w-4" />
          Call {AAMIN_CONTACT.emergencyDisplay}
        </a>
      </div>
    </div>
  )
}
