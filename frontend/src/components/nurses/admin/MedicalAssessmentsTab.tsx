'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  HeartHandshake,
  Search,
  Stethoscope,
  User,
  MapPin,
  Loader2,
  RefreshCw,
  ExternalLink,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest, Employee } from '@/types'
import { format } from 'date-fns'

type RequestWithNurse = EmergencyRequest & {
  nurseId?: string | null
  nurse?: Employee | null
}

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'ARRIVED_HOSPITAL']

export default function MedicalAssessmentsTab({ embedded = false }: { embedded?: boolean }) {
  const [requests, setRequests] = useState<RequestWithNurse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch patient care cases:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 12000)
    return () => clearInterval(interval)
  }, [])

  const activeCare = useMemo(
    () =>
      requests
        .filter((r) => r.nurseId && !CLOSED_STATUSES.includes(r.status))
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    [requests],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    if (!q) return activeCare
    return activeCare.filter((r) => {
      const nurseName = r.nurse
        ? `${r.nurse.firstName || ''} ${r.nurse.lastName || ''}`.toLowerCase()
        : ''
      const patientName = (r.patient?.fullName || r.callerName || '').toLowerCase()
      return (
        r.trackingCode?.toLowerCase().includes(q) ||
        nurseName.includes(q) ||
        patientName.includes(q) ||
        r.pickupLocation?.toLowerCase().includes(q)
      )
    })
  }, [activeCare, searchTerm])

  const stats = useMemo(
    () => ({
      total: activeCare.length,
      critical: activeCare.filter((r) => r.priority === 'CRITICAL').length,
      transporting: activeCare.filter((r) => r.status === 'TRANSPORTING').length,
      onScene: activeCare.filter((r) => ['ARRIVED_SCENE', 'PATIENT_STABILIZED'].includes(r.status)).length,
    }),
    [activeCare],
  )

  return (
    <div className={embedded ? 'p-6 pb-12 space-y-6' : 'p-6 max-w-[1600px] mx-auto space-y-6 pb-12'}>
      {!embedded && (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <HeartHandshake className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Clinical Operations
            </p>
            <h1 className="text-3xl font-black tracking-tight">Patient Care</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Active cases under nurse care — live missions with assigned clinical staff.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => fetchData(true)} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Cases', value: stats.total, icon: HeartHandshake, color: 'text-red-600 bg-red-50' },
          { label: 'Critical', value: stats.critical, icon: Activity, color: 'text-amber-600 bg-amber-50' },
          { label: 'On Scene', value: stats.onScene, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
          { label: 'Transporting', value: stats.transporting, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search case, nurse, patient, or location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading patient care cases…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No active patient care cases</p>
          <p className="text-sm text-slate-500 mt-1">No missions currently have an assigned nurse</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((req) => {
            const nurseName = req.nurse
              ? `${req.nurse.firstName || ''} ${req.nurse.lastName || ''}`.trim()
              : '—'
            const patientName = req.patient?.fullName || req.callerName || 'Unknown'
            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all"
              >
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">Case</p>
                      <p className="text-xl font-black">#{req.trackingCode}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-white/20 border border-white/30">
                      {req.priority}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Patient</p>
                      <p className="text-sm font-semibold text-slate-800">{patientName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Stethoscope className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Nurse</p>
                      <p className="text-sm font-semibold text-slate-800">{nurseName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{req.pickupLocation || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      {req.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(req.updatedAt || req.createdAt), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <Link href={`/admin/emergency-requests/${req.id}`}>
                    <Button variant="outline" size="sm" className="w-full rounded-xl">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Case
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
