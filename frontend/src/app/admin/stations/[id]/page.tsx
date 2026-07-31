'use client'

import { useParams } from 'next/navigation'
import StationDetailView from '@/components/features/stations/StationDetailView'

export default function StationDetailPage() {
  const params = useParams()
  const id = String(params?.id ?? '')
  return <StationDetailView stationId={id} />
}
