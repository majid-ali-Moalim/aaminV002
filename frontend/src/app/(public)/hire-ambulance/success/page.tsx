'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Home } from 'lucide-react'
import { LANG_KEY } from '@/components/public/hire-ambulance/constants'
import { getHireT, type HireLang } from '@/components/public/hire-ambulance/translations'

function resolveLang(param: string | null): HireLang {
  if (param === 'so' || param === 'en') return param
  try {
    const saved = sessionStorage.getItem(LANG_KEY)
    if (saved === 'so' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return 'en'
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const lang = resolveLang(searchParams.get('lang'))
  const t = getHireT(lang)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 pt-20 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-red-100 bg-white">
          <div className="bg-gradient-to-r from-red-600 to-rose-500 px-8 py-10 text-center text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">{t.success.title}</h1>
            <p className="text-red-100 text-sm mt-2">{t.success.thankYou}</p>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-sm text-slate-700 leading-relaxed">{t.success.received}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{t.success.emergencyNote}</p>

            <Link
              href="/"
              className="h-12 flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 transition"
            >
              <Home className="w-4 h-4" />
              {t.success.returnHome}
            </Link>
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
          <p className="text-sm font-medium text-slate-500">Loading…</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
