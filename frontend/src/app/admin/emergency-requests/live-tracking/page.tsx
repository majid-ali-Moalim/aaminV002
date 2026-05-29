'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, RefreshCw, Search, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'

const TRACKABLE = new Set([
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
])

export default function LiveUnitTrackingPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const data = await emergencyRequestsService.getAll()
      setRequests(
        (Array.isArray(data) ? data : []).filter(
          (r) => TRACKABLE.has(r.status) && r.ambulanceId,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.trackingCode?.toLowerCase().includes(q) ||
      r.ambulance?.ambulanceNumber?.toLowerCase().includes(q) ||
      r.patient?.fullName?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
          Monitoring & Tracking
        </p>
        <h1 className="text-3xl font-black">Live Unit Tracking</h1>
        <p className="text-red-100/80 mt-2">
          Track active ambulances and mission progress in real time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit or tracking code…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
        <Button variant="outline" onClick={load} className="rounded-xl">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Link href="/admin/dashboard/live">
          <Button className="rounded-xl bg-red-600 hover:bg-red-700 w-full sm:w-auto">
            <MapPin className="w-4 h-4 mr-2" />
            Dispatch Board
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 p-16 text-center bg-white rounded-2xl border border-slate-100">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No trackable units</p>
            <p className="text-sm text-slate-500 mt-1">Assign a unit to an active mission to enable tracking.</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-red-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-lg font-black text-red-600">{r.ambulance?.ambulanceNumber}</p>
                  <p className="text-sm text-slate-500">{r.trackingCode}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  <PriorityBadge priority={r.priority} />
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <p className="font-semibold text-slate-900">{r.patient?.fullName || 'Unknown'}</p>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.pickupLocation}</p>
              {r.destination && (
                <p className="text-xs text-slate-400 mt-1">→ {r.destination}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Link href={`/admin/emergency-requests/track/${r.id}`} className="flex-1">
                  <Button size="sm" className="w-full rounded-xl bg-red-600 hover:bg-red-700">
                    <MapPin className="w-4 h-4 mr-1" />
                    Live Track
                  </Button>
                </Link>
                <Link href={`/admin/emergency-requests/${r.id}`}>
                  <Button size="sm" variant="outline" className="rounded-xl">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
