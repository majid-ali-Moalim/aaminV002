'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Users,
  Siren,
  Activity,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService, patientsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'ARRIVED_HOSPITAL']

export default function PatientReportsPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [patientCount, setPatientCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const [cases, patients] = await Promise.all([
        emergencyRequestsService.getAll(),
        patientsService.getAll(),
      ])
      setRequests(Array.isArray(cases) ? cases : [])
      setPatientCount(Array.isArray(patients) ? patients.length : 0)
    } catch (err) {
      console.error('Failed to load patient reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const stats = useMemo(() => {
    const active = requests.filter((r) => !CLOSED_STATUSES.includes(r.status)).length
    const critical = requests.filter((r) => r.priority === 'CRITICAL').length
    const completed = requests.filter((r) => r.status === 'COMPLETED').length
    const cancelled = requests.filter((r) => r.status === 'CANCELLED').length
    const completionRate =
      requests.length > 0 ? Math.round((completed / requests.length) * 100) : 0

    const byPriority = requests.reduce<Record<string, number>>((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1
      return acc
    }, {})

    const byStatus = requests.reduce<Record<string, number>>((acc, r) => {
      const label = r.status.replace('_', ' ')
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})

    return { active, critical, completed, cancelled, completionRate, byPriority, byStatus }
  }, [requests])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart2 className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Case Analytics
            </p>
            <h1 className="text-3xl font-black tracking-tight">Reports</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Patient and emergency case statistics — volume, outcomes, and priority breakdown.
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
            <Link href="/admin/reports/emergency">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Emergency Reports
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
              { label: 'Registered Patients', value: patientCount, icon: Users, color: 'text-red-600 bg-red-50' },
              { label: 'Total Cases', value: requests.length, icon: Siren, color: 'text-blue-600 bg-blue-50' },
              { label: 'Active Cases', value: stats.active, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
              { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
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
                By Priority
              </h2>
              <div className="space-y-3">
                {Object.entries(stats.byPriority)
                  .sort(([, a], [, b]) => b - a)
                  .map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{priority}</span>
                      <span className="text-sm font-black text-slate-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                By Status
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(stats.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{status}</span>
                      <span className="text-sm font-black text-red-600">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Outcome Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Completed', value: stats.completed, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-50 text-red-700 border-red-100' },
                  { label: 'Still Active', value: stats.active, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`p-4 rounded-xl border text-center ${item.color}`}
                  >
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
