'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Truck,
  Activity,
  Gauge,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ambulancesService, reportsService } from '@/lib/api'
import { Ambulance } from '@/types'

type ResourceUtilization = {
  ambulances?: {
    total?: number
    available?: number
    onDuty?: number
    maintenance?: number
    utilizationRate?: number
  }
}

export default function AmbulanceReportsPage() {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [utilization, setUtilization] = useState<ResourceUtilization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const [fleet, resources] = await Promise.all([
        ambulancesService.getAll(),
        reportsService.getResourceUtilization().catch(() => null),
      ])
      setAmbulances(fleet)
      setUtilization(resources as ResourceUtilization)
      setError(null)
    } catch {
      setError('Failed to load ambulance reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const stats = {
    total: ambulances.length,
    available: ambulances.filter((a) => a.status === 'AVAILABLE').length,
    onDuty: ambulances.filter((a) => a.status === 'ON_DUTY').length,
    outOfService: ambulances.filter((a) => ['MAINTENANCE', 'UNAVAILABLE'].includes(a.status)).length,
    avgReadiness:
      ambulances.length > 0
        ? Math.round(
            ambulances.reduce((sum, a) => sum + (a.readinessScore ?? 100), 0) / ambulances.length,
          )
        : 0,
    utilizationRate:
      utilization?.ambulances?.utilizationRate ??
      (ambulances.length > 0
        ? Math.round((ambulances.filter((a) => a.status === 'ON_DUTY').length / ambulances.length) * 100)
        : 0),
  }

  const byType = ambulances.reduce<Record<string, number>>((acc, a) => {
    const type = a.vehicleType || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const byStation = ambulances.reduce<Record<string, number>>((acc, a) => {
    const station = a.station?.name || 'Unassigned'
    acc[station] = (acc[station] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart2 className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Fleet Analytics
            </p>
            <h1 className="text-3xl font-black tracking-tight">Ambulance Reports</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Fleet utilization, readiness, and deployment breakdown across stations and vehicle types.
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
            <Link href="/admin/reports/utilization">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Utilization Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading reports…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Fleet', value: stats.total, icon: Truck, color: 'text-red-600 bg-red-50' },
              { label: 'Available', value: stats.available, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'On Mission', value: stats.onDuty, icon: Truck, color: 'text-blue-600 bg-blue-50' },
              { label: 'Out of Service', value: stats.outOfService, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
              { label: 'Avg Readiness', value: `${stats.avgReadiness}%`, icon: Gauge, color: 'text-purple-600 bg-purple-50' },
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
                Utilization Rate
              </h2>
              <div className="flex items-end gap-4">
                <p className="text-5xl font-black text-red-600">{stats.utilizationRate}%</p>
                <p className="text-sm text-slate-500 pb-2">
                  of fleet currently on mission
                </p>
              </div>
              <div className="mt-4 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-700 transition-all"
                  style={{ width: `${Math.min(stats.utilizationRate, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                By Vehicle Type
              </h2>
              <div className="space-y-3">
                {Object.entries(byType).length === 0 ? (
                  <p className="text-sm text-slate-500">No vehicle data</p>
                ) : (
                  Object.entries(byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{type}</span>
                        <span className="text-sm font-black text-slate-900">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                By Base Station
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(byStation)
                  .sort(([, a], [, b]) => b - a)
                  .map(([station, count]) => (
                    <div
                      key={station}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="text-sm font-medium text-slate-700 truncate pr-2">{station}</span>
                      <span className="text-sm font-black text-red-600 shrink-0">{count}</span>
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
