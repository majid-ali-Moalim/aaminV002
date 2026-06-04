'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  History,
  Search,
  Stethoscope,
  User,
  MapPin,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest, Employee } from '@/types'
import { format } from 'date-fns'

type RequestWithNurse = EmergencyRequest & {
  nurseId?: string | null
  nurse?: Employee | null
}

const HISTORY_STATUSES = ['COMPLETED', 'ARRIVED_HOSPITAL', 'CANCELLED']

export default function NurseMissionHistoryPage() {
  const [requests, setRequests] = useState<RequestWithNurse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch mission history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const history = useMemo(
    () =>
      requests
        .filter((r) => r.nurseId && HISTORY_STATUSES.includes(r.status))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        ),
    [requests],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    if (!q) return history
    return history.filter((r) => {
      const nurseName = r.nurse
        ? `${r.nurse.firstName || ''} ${r.nurse.lastName || ''}`.toLowerCase()
        : ''
      return (
        r.trackingCode?.toLowerCase().includes(q) ||
        nurseName.includes(q) ||
        r.pickupLocation?.toLowerCase().includes(q) ||
        r.ambulance?.ambulanceNumber?.toLowerCase().includes(q)
      )
    })
  }, [history, searchTerm])

  const stats = useMemo(
    () => ({
      total: history.length,
      completed: history.filter((r) => r.status === 'COMPLETED').length,
      atHospital: history.filter((r) => r.status === 'ARRIVED_HOSPITAL').length,
      cancelled: history.filter((r) => r.status === 'CANCELLED').length,
    }),
    [history],
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <History className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Completed Missions
            </p>
            <h1 className="text-3xl font-black tracking-tight">Mission History</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Past emergency missions with assigned nurses — completed, hospital arrivals, and cancelled.
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Missions', value: stats.total, icon: History, color: 'text-red-600 bg-red-50' },
          { label: 'Completed', value: stats.completed, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'At Hospital', value: stats.atHospital, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
          { label: 'Cancelled', value: stats.cancelled, icon: User, color: 'text-amber-600 bg-amber-50' },
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
            placeholder="Search tracking code, nurse, location, or unit…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading mission history…</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Case</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nurse</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      No mission history records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => {
                    const nurseName = req.nurse
                      ? `${req.nurse.firstName || ''} ${req.nurse.lastName || ''}`.trim()
                      : '—'
                    return (
                      <tr key={req.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">#{req.trackingCode}</p>
                          <p className="text-xs text-slate-500">{req.priority}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700">{nurseName}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {req.ambulance?.ambulanceNumber || '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-600 max-w-[200px] truncate">
                          {req.pickupLocation || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {format(new Date(req.updatedAt || req.createdAt), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/admin/emergency-requests/${req.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
