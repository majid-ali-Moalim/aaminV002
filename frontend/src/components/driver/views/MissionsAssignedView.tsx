'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { driverMissionsApi } from '@/lib/driverApi'
import { MissionStatusBadge, PriorityBadge, DriverSkeleton } from '@/components/driver/DriverUI'
import { DriverPanel } from '@/components/driver/DriverModuleShell'
import { MapPin, Clock, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function MissionsAssignedView() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    driverMissionsApi
      .getHistory(1, 20, 'ASSIGNED')
      .then((d) => setItems(d.missions || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const handleAccept = async (id: string) => {
    try {
      await driverMissionsApi.updateStatus(id, 'DISPATCHED')
      toast.success('Mission accepted')
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to accept')
    }
  }

  if (loading) return <div className="driver-card"><DriverSkeleton lines={5} /></div>

  if (!items.length) {
    return <DriverPanel title="Assigned Missions" empty="No pending assignments at this time." />
  }

  return (
    <div className="driver-list-stack">
      {items.map((m) => (
        <div key={m.id} className="driver-mission-list-card">
          <div className="driver-mlc-top">
            <span className="driver-mlc-code">{m.trackingCode}</span>
            <div className="driver-mlc-badges">
              <MissionStatusBadge status={m.status} />
              <PriorityBadge priority={m.priority} />
            </div>
          </div>
          <div className="driver-mlc-row"><MapPin size={13} /><span>{m.pickupLocation}</span></div>
          <div className="driver-mlc-row"><Clock size={13} /><span>Assigned {m.assignedAt ? format(new Date(m.assignedAt), 'MMM d, h:mm a') : '—'}</span></div>
          <div className="driver-assigned-actions">
            <button type="button" className="driver-btn-sm primary" onClick={() => handleAccept(m.id)}>Accept Assignment</button>
            <Link href={`/driver/missions/active`} className="driver-btn-sm ghost">View Details <ChevronRight size={14} /></Link>
          </div>
        </div>
      ))}
    </div>
  )
}
