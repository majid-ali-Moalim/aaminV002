import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import StationReportsView from '@/components/features/stations/StationReportsView'

export default function StationReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <StationReportsView />
    </Suspense>
  )
}
