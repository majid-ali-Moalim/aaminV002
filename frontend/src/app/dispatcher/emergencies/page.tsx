'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import AssignModal from '@/components/features/emergency/AssignModal'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function DispatcherEmergenciesPage() {
  const { canOperate, loading: authLoading } = useDispatcherAccess()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignTarget, setAssignTarget] = useState<EmergencyRequest | null>(null)

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const data = await dispatcherDashboardApi.getPendingQueue()
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load emergency queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) fetchQueue()
    const t = setInterval(fetchQueue, 10000)
    return () => clearInterval(t)
  }, [authLoading])

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase()
    return (
      !q ||
      r.trackingCode.toLowerCase().includes(q) ||
      r.pickupLocation.toLowerCase().includes(q) ||
      r.patient?.fullName?.toLowerCase().includes(q)
    )
  })

  if (authLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>
  }

  if (!canOperate) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-black text-slate-900">Shift Required</h2>
        <p className="text-sm text-slate-600 mt-2">Start your shift from the dashboard to access the emergency queue.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Emergency Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Pending cases awaiting ambulance assignment</p>
        </div>
        <Button onClick={fetchQueue} variant="outline" className="rounded-xl border-red-100 text-red-700 font-bold">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input
          className="w-full h-12 pl-11 pr-4 rounded-2xl border border-red-100 bg-white focus:ring-2 focus:ring-red-500/10 outline-none text-sm font-medium"
          placeholder="Search tracking code, patient, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && requests.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-16">No pending emergencies</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-red-50 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">{req.trackingCode}</p>
                  <p className="text-sm text-slate-600">{req.patient?.fullName || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-1">{req.pickupLocation}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={req.priority} />
                  <Button
                    className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
                    onClick={() => setAssignTarget(req)}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => {
            setAssignTarget(null)
            toast.success('Assigned')
            fetchQueue()
          }}
        />
      )}
    </div>
  )
}
