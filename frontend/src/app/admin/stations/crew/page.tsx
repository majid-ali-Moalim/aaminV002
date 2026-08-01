import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import StationCrewAvailabilityView from '@/components/features/stations/StationCrewAvailabilityView'

export default function StationCrewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <StationCrewAvailabilityView variant="admin" />
    </Suspense>
  )
}
