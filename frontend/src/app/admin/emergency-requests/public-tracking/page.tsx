'use client'

import Link from 'next/link'
import { Globe, ExternalLink, Copy, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

export default function PublicTrackingPage() {
  const [copied, setCopied] = useState(false)
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/ambulance-tracking`
      : '/ambulance-tracking'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Public tracking link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
          Monitoring & Tracking
        </p>
        <h1 className="text-3xl font-black">Public Tracking</h1>
        <p className="text-red-100/80 mt-2">
          Share the patient tracking portal so families can follow ambulance progress with a 7-character code.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <Globe className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Public portal URL</p>
            <p className="text-lg font-black text-slate-900 break-all">{publicUrl}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={copyLink} variant="outline" className="rounded-xl">
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </>
            )}
          </Button>
          <Link href="/ambulance-tracking" target="_blank">
            <Button className="rounded-xl bg-red-600 hover:bg-red-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open public portal
            </Button>
          </Link>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">How it works</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide the patient&apos;s tracking code after a case is created.</li>
            <li>Families visit the public portal and enter the code.</li>
            <li>Status updates appear as the mission progresses through dispatch.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
