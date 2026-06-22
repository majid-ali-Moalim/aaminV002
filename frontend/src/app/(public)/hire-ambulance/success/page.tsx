'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Clock, ExternalLink, Truck } from 'lucide-react'

function HireAmbulanceSuccessContent() {
  const searchParams = useSearchParams()
  const trackingCode = searchParams.get('code')?.trim() ?? ''

  const trackHref = useMemo(
    () => (trackingCode ? `/ambulance-tracking?code=${encodeURIComponent(trackingCode)}` : '/ambulance-tracking'),
    [trackingCode],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 pt-20 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-red-100 bg-white">
          <div className="bg-gradient-to-r from-red-600 to-rose-500 px-8 py-10 text-center text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Request Sent</h1>
            <p className="text-red-100 text-sm mt-2 max-w-sm mx-auto">
              Thank you. Your ambulance request has been received and our team is arranging help for you.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 flex gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-900">Ambulance service is coming soon</p>
                <p className="text-sm text-emerald-800/90 mt-1 leading-relaxed">
                  A dispatcher is reviewing your request now. Please keep your phone nearby — we will contact you
                  shortly with updates.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5 flex gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-900">What happens next</p>
                <ul className="text-sm text-amber-900/90 mt-2 space-y-1.5 list-disc list-inside">
                  <li>Your case is logged in the Aamin dispatch system</li>
                  <li>The nearest available ambulance will be assigned</li>
                  <li>You can track progress using the button below</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={trackHref}
                className="h-12 flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 transition"
              >
                Track your ambulance <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-700 font-bold uppercase text-sm hover:bg-slate-50 transition"
              >
                Return home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HireAmbulanceSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
          <p className="text-sm font-medium text-slate-500">Loading confirmation…</p>
        </div>
      }
    >
      <HireAmbulanceSuccessContent />
    </Suspense>
  )
}
