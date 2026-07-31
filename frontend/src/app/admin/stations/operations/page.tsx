import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import StationOperationsView from '@/components/features/stations/StationOperationsView'

export default function StationOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <StationOperationsView />
    </Suspense>
  )
}
