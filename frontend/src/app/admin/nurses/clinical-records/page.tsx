'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FileText, HeartHandshake, ClipboardList, Loader2 } from 'lucide-react'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import PatientCareRecordsTab from '@/components/nurses/admin/PatientCareRecordsTab'
import MedicalAssessmentsTab from '@/components/nurses/admin/MedicalAssessmentsTab'
import TreatmentRecordsTab from '@/components/nurses/admin/TreatmentRecordsTab'

const TABS = [
  { id: 'records', label: 'Patient Care Records', icon: FileText },
  { id: 'assessments', label: 'Medical Assessments', icon: HeartHandshake },
  { id: 'treatment', label: 'Treatment Records', icon: ClipboardList },
] as const

type TabId = (typeof TABS)[number]['id']

function normalizeTab(value: string | null): TabId {
  if (value === 'assessments' || value === 'care') return 'assessments'
  if (value === 'treatment') return 'treatment'
  return 'records'
}

function NurseClinicalRecordsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = normalizeTab(searchParams.get('tab'))

  const setTab = (id: string) => {
    router.replace(`/admin/nurses/clinical-records?tab=${id}`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-slate-900 text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <HeartHandshake className="w-32 h-32" />
        </div>
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
            Nurse Management · Clinical Archive
          </p>
          <h1 className="text-3xl font-black tracking-tight">Clinical Records</h1>
          <p className="text-red-100/80 mt-2 max-w-2xl text-sm">
            Patient care archives, live medical assessments, and treatment documentation in one workspace.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        <SectionTabs tabs={TABS.map(({ id, label }) => ({ id, label }))} active={tab} onChange={setTab} />
      </div>

      <div className="max-w-[1600px] mx-auto">
        {tab === 'records' && <PatientCareRecordsTab embedded />}
        {tab === 'assessments' && <MedicalAssessmentsTab embedded />}
        {tab === 'treatment' && <TreatmentRecordsTab embedded />}
      </div>
    </div>
  )
}

export default function NurseClinicalRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading clinical records…
        </div>
      }
    >
      <NurseClinicalRecordsContent />
    </Suspense>
  )
}
