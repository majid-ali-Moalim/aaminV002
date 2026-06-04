'use client'

import { useState, useEffect } from 'react'
import {
  History,
  Search,
  Truck,
  User,
  Stethoscope,
  Warehouse,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ambulancesService } from '@/lib/api'
import { Ambulance } from '@/types'

function getEmployeeByRole(ambulance: Ambulance, roleHint: string) {
  return ambulance.employees?.find((e) =>
    e.employeeRole?.name?.toUpperCase().includes(roleHint),
  )
}

function formatEmployeeName(emp: { firstName?: string; lastName?: string; user?: { username?: string } } | undefined) {
  if (!emp) return '—'
  const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
  return name || emp.user?.username || '—'
}

export default function AssignmentHistoryPage() {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await ambulancesService.getAll()
      setAmbulances(data)
      setError(null)
    } catch {
      setError('Failed to load assignment records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const filtered = ambulances.filter((a) => {
    const q = searchTerm.toLowerCase()
    if (!q) return true
    const driver = getEmployeeByRole(a, 'DRIVER')
    const nurse = getEmployeeByRole(a, 'NURSE')
    return (
      a.ambulanceNumber?.toLowerCase().includes(q) ||
      a.plateNumber?.toLowerCase().includes(q) ||
      a.station?.name?.toLowerCase().includes(q) ||
      formatEmployeeName(driver).toLowerCase().includes(q) ||
      formatEmployeeName(nurse).toLowerCase().includes(q)
    )
  })

  const assignedCount = ambulances.filter((a) => (a.employees?.length ?? 0) > 0).length
  const unassignedCount = ambulances.length - assignedCount

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <History className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Crew Assignments
            </p>
            <h1 className="text-3xl font-black tracking-tight">Assignment History</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Current crew pairings across the fleet — driver, nurse, and station assignments.
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Units', value: ambulances.length, icon: Truck, color: 'text-red-600 bg-red-50' },
          { label: 'With Crew', value: assignedCount, icon: User, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Unassigned', value: unassignedCount, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
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
            placeholder="Search unit, crew, or station…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
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
          <p className="text-sm font-semibold text-slate-500">Loading assignments…</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Ambulance
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Base Station
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Nurse
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                      No matching assignment records
                    </td>
                  </tr>
                ) : (
                  filtered.map((ambulance) => {
                    const driver = getEmployeeByRole(ambulance, 'DRIVER')
                    const nurse = getEmployeeByRole(ambulance, 'NURSE')
                    const statusLabel = ambulance.status.replace('_', ' ')

                    return (
                      <tr key={ambulance.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-50 text-red-600">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{ambulance.ambulanceNumber}</p>
                              <p className="text-xs text-slate-500 font-mono">{ambulance.plateNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Warehouse className="w-4 h-4 text-red-500 shrink-0" />
                            {ambulance.station?.name || '—'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className={driver ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}>
                              {formatEmployeeName(driver)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className={nurse ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}>
                              {formatEmployeeName(nurse)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {ambulance.updatedAt
                            ? new Date(ambulance.updatedAt).toLocaleString()
                            : '—'}
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
