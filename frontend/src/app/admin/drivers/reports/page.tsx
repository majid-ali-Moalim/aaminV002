'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart2,
  Users,
  Activity,
  Truck,
  Star,
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { driversService, emergencyRequestsService } from '@/lib/api'
import { Employee, EmergencyRequest } from '@/types'

export default function DriverReportsPage() {
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const [driversData, statsData, casesData] = await Promise.all([
        driversService.getAll(),
        driversService.getStats().catch(() => null),
        emergencyRequestsService.getAll(),
      ])
      setDrivers(Array.isArray(driversData) ? driversData : [])
      setStats(statsData as Record<string, number> | null)
      setRequests(Array.isArray(casesData) ? casesData : [])
    } catch (err) {
      console.error('Failed to load driver reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const computed = useMemo(() => {
    const withAmbulance = drivers.filter((d) => d.assignedAmbulanceId).length
    const onDuty = drivers.filter((d) => d.shiftStatus === 'ON_DUTY').length
    const avgRating =
      drivers.length > 0
        ? (
            drivers.reduce((sum, d) => sum + (d.rating ?? 0), 0) /
            drivers.filter((d) => d.rating != null).length || 1
          ).toFixed(1)
        : '0.0'
    const missionsWithDriver = requests.filter((r) => r.driverId).length
    const completedMissions = requests.filter(
      (r) => r.driverId && r.status === 'COMPLETED',
    ).length
    const completionRate =
      missionsWithDriver > 0
        ? Math.round((completedMissions / missionsWithDriver) * 100)
        : 0

    const byShift = drivers.reduce<Record<string, number>>((acc, d) => {
      const key = (d.shiftStatus || 'UNKNOWN').replace('_', ' ')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const topDrivers = [...drivers]
      .filter((d) => d.totalTrips != null || d.rating != null)
      .sort((a, b) => (b.totalTrips ?? 0) - (a.totalTrips ?? 0))
      .slice(0, 5)

    return { withAmbulance, onDuty, avgRating, missionsWithDriver, completedMissions, completionRate, byShift, topDrivers }
  }, [drivers, requests])

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
            <h1 className="text-3xl font-black tracking-tight">Driver Reports</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Workforce utilization, mission completion, and driver performance overview.
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
            <Link href="/admin/drivers/performance">
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
              { label: 'Total Drivers', value: stats?.total ?? drivers.length, icon: Users, color: 'text-red-600 bg-red-50' },
              { label: 'On Duty', value: stats?.onDuty ?? computed.onDuty, icon: Activity, color: 'text-blue-600 bg-blue-50' },
              { label: 'With Unit', value: computed.withAmbulance, icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Avg Rating', value: computed.avgRating, icon: Star, color: 'text-amber-600 bg-amber-50' },
              { label: 'Mission Completion', value: `${computed.completionRate}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
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
                By Shift Status
              </h2>
              <div className="space-y-3">
                {Object.entries(computed.byShift)
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
                  <p className="text-4xl font-black text-red-600">{computed.missionsWithDriver}</p>
                  <p className="text-sm text-slate-500 pb-1">missions with assigned driver</p>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-700"
                    style={{ width: `${Math.min(computed.completionRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {computed.completedMissions} completed of {computed.missionsWithDriver} driver-assigned missions
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">
                Top Drivers by Trips
              </h2>
              {computed.topDrivers.length === 0 ? (
                <p className="text-sm text-slate-500">No trip data available yet</p>
              ) : (
                <div className="space-y-2">
                  {computed.topDrivers.map((driver, idx) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-sm font-black">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{driver.station?.name || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{driver.totalTrips ?? 0} trips</p>
                        {driver.rating != null && (
                          <p className="text-xs text-amber-600 flex items-center justify-end gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            {driver.rating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
