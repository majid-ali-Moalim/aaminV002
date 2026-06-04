'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Users,
  Activity,
  Stethoscope,
  Loader2,
  RefreshCw,
  ExternalLink,
  HeartHandshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { nursesService, emergencyRequestsService } from '@/lib/api'
import { Employee, EmergencyRequest } from '@/types'

type RequestWithNurse = EmergencyRequest & { nurseId?: string | null }

export default function NurseReportsPage() {
  const [nurses, setNurses] = useState<Employee[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [requests, setRequests] = useState<RequestWithNurse[]>([])
  const [careRecords, setCareRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const [nursesData, statsData, casesData, recordsData] = await Promise.all([
        nursesService.getAll(),
        nursesService.getStats().catch(() => null),
        emergencyRequestsService.getAll(),
        nursesService.getPatientCareRecords().catch(() => []),
      ])
      setNurses(Array.isArray(nursesData) ? nursesData : [])
      setStats(statsData as Record<string, number> | null)
      setRequests(Array.isArray(casesData) ? casesData : [])
      setCareRecords(Array.isArray(recordsData) ? recordsData : [])
    } catch (err) {
      console.error('Failed to load nurse reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const computed = useMemo(() => {
    const onDuty = nurses.filter((n) => n.status === 'ON_DUTY' || n.shiftStatus === 'ON_DUTY').length
    const available = nurses.filter((n) => n.status === 'AVAILABLE' || n.shiftStatus === 'AVAILABLE').length
    const missionsWithNurse = requests.filter((r) => r.nurseId).length
    const completedMissions = requests.filter(
      (r) => r.nurseId && r.status === 'COMPLETED',
    ).length
    const completionRate =
      missionsWithNurse > 0 ? Math.round((completedMissions / missionsWithNurse) * 100) : 0

    const byStatus = nurses.reduce<Record<string, number>>((acc, n) => {
      const key = (n.status || n.shiftStatus || 'UNKNOWN').replace('_', ' ')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const icuCount = nurses.filter((n) =>
      (n as { specialization?: string }).specialization?.includes('ICU'),
    ).length

    return {
      onDuty,
      available,
      missionsWithNurse,
      completedMissions,
      completionRate,
      byStatus,
      icuCount,
      treatmentRecords: careRecords.length,
    }
  }, [nurses, requests, careRecords])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart2 className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Clinical Analytics
            </p>
            <h1 className="text-3xl font-black tracking-tight">Nurse Reports</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Workforce utilization, mission coverage, and treatment documentation overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => fetchData(true)}
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/admin/nurses/performance">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Performance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading reports…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Nurses', value: stats?.total ?? nurses.length, icon: Users, color: 'text-red-600 bg-red-50' },
              { label: 'On Duty', value: stats?.onDuty ?? computed.onDuty, icon: Activity, color: 'text-blue-600 bg-blue-50' },
              { label: 'Available', value: stats?.available ?? computed.available, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Treatment Records', value: computed.treatmentRecords, icon: HeartHandshake, color: 'text-purple-600 bg-purple-50' },
              { label: 'Mission Completion', value: `${computed.completionRate}%`, icon: BarChart2, color: 'text-amber-600 bg-amber-50' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                By Status
              </h2>
              <div className="space-y-3">
                {Object.entries(computed.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{status}</span>
                      <span className="text-sm font-black text-red-600">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Mission Summary
              </h2>
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <p className="text-4xl font-black text-red-600">{computed.missionsWithNurse}</p>
                  <p className="text-sm text-slate-500 pb-1">missions with assigned nurse</p>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-700"
                    style={{ width: `${Math.min(computed.completionRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {computed.completedMissions} completed of {computed.missionsWithNurse} nurse-assigned missions
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Workforce Highlights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'ICU Specialists', value: computed.icuCount, color: 'bg-purple-50 text-purple-700 border-purple-100' },
                  { label: 'Pending Clearance', value: stats?.pendingClearance ?? 0, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                  { label: 'Care Records Filed', value: computed.treatmentRecords, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                ].map((item) => (
                  <div key={item.label} className={`p-4 rounded-xl border text-center ${item.color}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.label}</p>
                    <p className="text-3xl font-black mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
