'use client'

import Link from 'next/link'
import { Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DispatcherPatientRecordsPage() {
  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto pb-12">
      <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-red-700 to-red-600 p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
          Patient Documentation
        </p>
        <h1 className="text-3xl font-black tracking-tight">Case Records</h1>
        <p className="text-red-100/80 mt-2 max-w-2xl text-sm">
          Browse patient case history and update records from the dispatcher console.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
        <FileText className="w-12 h-12 text-red-500 mx-auto" />
        <p className="text-slate-600 font-medium">
          Open the patient case archive to review active and closed missions.
        </p>
        <Link href="/dispatcher/patients/cases">
          <Button className="rounded-xl bg-red-600 hover:bg-red-700 font-bold">Open Patient Cases</Button>
        </Link>
      </div>
    </div>
  )
}
