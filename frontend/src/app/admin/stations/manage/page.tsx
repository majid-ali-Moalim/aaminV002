import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import StationManageView from '@/components/features/stations/StationManageView'

export default function StationManagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <StationManageView />
    </Suspense>
  )
}
