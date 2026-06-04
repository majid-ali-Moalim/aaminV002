'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Truck,
  Clock,
  RefreshCw,
  Navigation,
  FileText,
  Stethoscope,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'

export default function EmergencyCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [request, setRequest] = useState<EmergencyRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCase = useCallback(async () => {
    try {
      setError('')
      const data = await emergencyRequestsService.getById(id)
      if (!data) {
        setError('Case not found')
        setRequest(null)
        return
      }
      setRequest(data)
    } catch (err) {
      console.error('Failed to load case:', err)
      setError('Unable to load this case. It may have been removed or you lack access.')
      setRequest(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    setIsLoading(true)
    loadCase()
    const interval = setInterval(loadCase, 15000)
    return () => clearInterval(interval)
  }, [loadCase])

  if (isLoading && !request) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading case…</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="py-16 text-center bg-white rounded-2xl border border-red-100">
          <p className="font-semibold text-red-600">{error || 'Case not found'}</p>
        </div>
      </div>
    )
  }

  const logs = [...(request.statusLogs ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadCase} className="rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href={`/admin/emergency-requests/track/${request.id}`}>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700">
              <Navigation className="w-4 h-4 mr-2" />
              Live tracking
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Case file
            </p>
            <h1 className="text-3xl font-black tracking-tight">{request.trackingCode}</h1>
            <p className="text-red-100/80 mt-2 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Created {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              <span className="text-red-200/60">·</span>
              {format(new Date(request.createdAt), 'PPp')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={request.priority} size="sm" />
            <StatusBadge status={request.status} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {request.patient?.fullName || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                <p className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {request.patient?.phone || request.callerPhone || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Locations
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{request.pickupLocation}</p>
                {request.pickupLandmark && (
                  <p className="text-xs text-slate-500 mt-1">{request.pickupLandmark}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Destination
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {request.destination || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Clinical */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Clinical information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Condition
                </p>
                <p className="font-medium text-slate-700 mt-1">
                  {request.patientCondition || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Symptoms
                </p>
                <p className="font-medium text-slate-700 mt-1">{request.symptoms || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Conscious / Breathing
                </p>
                <p className="font-medium text-slate-700 mt-1">
                  {request.consciousStatus || '—'} / {request.breathingStatus || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Equipment needs
                </p>
                <p className="font-medium text-slate-700 mt-1">
                  {[request.needsOxygen && 'Oxygen', request.needsStretcher && 'Stretcher']
                    .filter(Boolean)
                    .join(', ') || 'None noted'}
                </p>
              </div>
            </div>
            {(request.notes || request.manualDispatchNotes) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <FileText className="w-3 h-3" />
                  Notes
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {request.manualDispatchNotes || request.notes}
                </p>
              </div>
            )}
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Assignment
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ambulance
                </p>
                <p className="text-sm font-bold text-red-600 mt-1">
                  {request.ambulance?.ambulanceNumber || 'Unassigned'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Driver
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {request.driver
                    ? `${request.driver.firstName} ${request.driver.lastName}`
                    : 'Unassigned'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nurse
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {request.nurse
                    ? `${request.nurse.firstName} ${request.nurse.lastName}`
                    : 'Unassigned'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              Mission status is updated by the assigned driver in the field.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Status history
            </h2>
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500">No status updates yet.</p>
            ) : (
              <div className="space-y-4">
                {logs.map((log, idx) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          idx === 0 ? 'bg-red-500 ring-4 ring-red-100' : 'bg-slate-300'
                        }`}
                      />
                      {idx < logs.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 min-h-[1rem] mt-1" />
                      )}
                    </div>
                    <div className="pb-2 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{log.toStatus}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.createdAt), 'PPp')}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-slate-600 mt-1 italic">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
