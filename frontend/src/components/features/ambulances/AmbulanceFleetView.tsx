'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Eye,
  Trash2,
  Truck,
  MapPin,
  User,
  AlertCircle,
  Wrench,
  X,
  Loader2,
  RefreshCw,
  Stethoscope,
  Wind,
  HeartPulse,
  Gauge,
  Droplet,
  Warehouse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ambulancesService, employeesService, systemSetupService } from '@/lib/api'
import { Ambulance, Employee, EmployeeRole } from '@/types'

const STATUS_STYLES: Record<string, { badge: string; header: string; label: string }> = {
  AVAILABLE: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    header: 'from-emerald-600 to-emerald-700',
    label: 'Available',
  },
  ON_DUTY: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    header: 'from-blue-600 to-blue-700',
    label: 'On Duty',
  },
  MAINTENANCE: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    header: 'from-amber-500 to-orange-600',
    label: 'Maintenance',
  },
  UNAVAILABLE: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    header: 'from-slate-600 to-slate-800',
    label: 'Unavailable',
  },
}

function getEmployeeByRole(ambulance: Ambulance, roleHint: string) {
  return ambulance.employees?.find((e) =>
    e.employeeRole?.name?.toUpperCase().includes(roleHint),
  )
}

export interface AmbulanceFleetViewConfig {
  title: string
  subtitle: string
  heroBadge?: string
  presetStatuses?: string[]
  hideStatusFilter?: boolean
  showRegisterButton?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export default function AmbulanceFleetView({
  title,
  subtitle,
  heroBadge = 'Fleet Management',
  presetStatuses,
  hideStatusFilter = false,
  showRegisterButton = true,
  emptyTitle = 'No ambulances found',
  emptyDescription = 'Try adjusting filters or register a new unit',
}: AmbulanceFleetViewConfig) {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedAmbulanceToAssign, setSelectedAmbulanceToAssign] = useState<Ambulance | null>(null)
  const [availableDrivers, setAvailableDrivers] = useState<Employee[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchAmbulances = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await ambulancesService.getAll()
      setAmbulances(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching ambulances:', err)
      setError('Failed to load ambulances. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDrivers = useCallback(async () => {
    try {
      const roles = await systemSetupService.getRoles()
      const driverRole = roles.find((r: EmployeeRole) =>
        r.name.toUpperCase().includes('DRIVER'),
      )
      if (driverRole) {
        const data = await employeesService.getAll(driverRole.id)
        setDrivers(data)
      }
    } catch (err) {
      console.error('Error fetching drivers:', err)
    }
  }, [])

  useEffect(() => {
    fetchAmbulances(true)
    fetchDrivers()
    const interval = setInterval(() => fetchAmbulances(false), 10000)
    return () => clearInterval(interval)
  }, [fetchAmbulances, fetchDrivers])

  const scopedAmbulances = presetStatuses
    ? ambulances.filter((a) => presetStatuses.includes(a.status))
    : ambulances

  const filteredAmbulances = scopedAmbulances.filter((ambulance) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      ambulance.ambulanceNumber?.toLowerCase().includes(q) ||
      ambulance.plateNumber?.toLowerCase().includes(q) ||
      ambulance.fleetNumber?.toLowerCase().includes(q) ||
      ambulance.vehicleType?.toLowerCase().includes(q) ||
      ambulance.station?.name?.toLowerCase().includes(q)
    const matchesStatus = statusFilter === '' || ambulance.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: scopedAmbulances.length,
    available: scopedAmbulances.filter((a) => a.status === 'AVAILABLE').length,
    onDuty: scopedAmbulances.filter((a) => a.status === 'ON_DUTY').length,
    maintenance: scopedAmbulances.filter((a) => a.status === 'MAINTENANCE').length,
  }

  const handleViewDetails = (ambulance: Ambulance) => {
    setSelectedAmbulance(ambulance)
    setShowDetails(true)
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await ambulancesService.updateStatus(id, status)
      fetchAmbulances(false)
    } catch {
      alert('Failed to update status')
    }
  }

  const openAssignModal = (ambulance: Ambulance) => {
    setSelectedAmbulanceToAssign(ambulance)
    setAvailableDrivers(drivers.filter((d) => !d.assignedAmbulanceId))
    setIsAssignModalOpen(true)
  }

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedAmbulanceToAssign) return
    try {
      setIsSubmitting(true)
      await ambulancesService.assignDriver(selectedAmbulanceToAssign.id, driverId)
      setIsAssignModalOpen(false)
      fetchAmbulances(false)
      fetchDrivers()
    } catch {
      alert('Failed to assign driver')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAmbulance = async (id: string) => {
    if (!confirm('Delete this ambulance from the fleet?')) return
    try {
      await ambulancesService.delete(id)
      fetchAmbulances(false)
    } catch {
      alert('Failed to delete ambulance')
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Truck className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              {heroBadge}
            </p>
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => fetchAmbulances(true)}
              className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {showRegisterButton && (
              <Link href="/admin/ambulances/add">
                <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Ambulance
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: presetStatuses ? 'Units Shown' : 'Total Fleet', value: stats.total, icon: Truck, color: 'text-red-600 bg-red-50' },
          { label: 'Available', value: stats.available, icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'On Duty', value: stats.onDuty, icon: MapPin, color: 'text-blue-600 bg-blue-50' },
          { label: 'Maintenance', value: stats.maintenance, icon: Wrench, color: 'text-amber-600 bg-amber-50' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ID, plate, fleet number, station…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
        {!hideStatusFilter && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:w-48 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {loading && ambulances.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading fleet…</p>
        </div>
      ) : filteredAmbulances.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">{emptyTitle}</p>
          <p className="text-sm text-slate-500 mt-1">{emptyDescription}</p>
          {showRegisterButton && (
            <Link href="/admin/ambulances/add" className="inline-block mt-4">
              <Button className="rounded-xl bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Register Ambulance
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAmbulances.map((ambulance) => {
            const style = STATUS_STYLES[ambulance.status] || STATUS_STYLES.UNAVAILABLE
            const driver = getEmployeeByRole(ambulance, 'DRIVER')
            const nurse = getEmployeeByRole(ambulance, 'NURSE')
            const readiness = ambulance.readinessScore ?? 100

            return (
              <div
                key={ambulance.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all duration-300 flex flex-col"
              >
                <div className={`bg-gradient-to-r ${style.header} p-4 text-white`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                        Ambulance ID
                      </p>
                      <p className="text-xl font-black truncate">{ambulance.ambulanceNumber}</p>
                      <p className="text-xs font-mono text-white/80 mt-0.5">{ambulance.plateNumber}</p>
                      {ambulance.fleetNumber && (
                        <p className="text-[10px] text-white/70 mt-1">Fleet {ambulance.fleetNumber}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-white/20 border-white/30">
                      {style.label}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Vehicle
                    </p>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                      {ambulance.vehicleType || 'Ambulance'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[ambulance.vehicleBrand, ambulance.vehicleModel, ambulance.vehicleYear]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <Warehouse className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Base Station
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {ambulance.station?.name || 'Not assigned'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3" /> Driver
                      </p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                        {driver
                          ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() ||
                            driver.user?.username
                          : 'Unassigned'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> Nurse
                      </p>
                      <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                        {nurse
                          ? `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() ||
                            nurse.user?.username
                          : 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ambulance.oxygenAvailable && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        <Wind className="w-3 h-3" /> O₂
                      </span>
                    )}
                    {ambulance.defibrillatorAvailable && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100">
                        <HeartPulse className="w-3 h-3" /> AED
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                        readiness >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : readiness >= 50
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                      }`}
                    >
                      <Gauge className="w-3 h-3" />
                      {readiness}% ready
                    </span>
                    {ambulance.fuelLevel != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                        <Droplet className="w-3 h-3" />
                        {ambulance.fuelLevel}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(ambulance)}
                    className="rounded-xl flex-1 min-w-[80px]"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {!driver && (
                    <Button
                      size="sm"
                      onClick={() => openAssignModal(ambulance)}
                      className="rounded-xl bg-red-600 hover:bg-red-700 flex-1 min-w-[80px]"
                    >
                      <User className="w-4 h-4 mr-1" />
                      Assign
                    </Button>
                  )}
                  <select
                    value={ambulance.status}
                    onChange={(e) => handleUpdateStatus(ambulance.id, e.target.value)}
                    className="flex-1 min-w-[100px] text-xs font-semibold rounded-xl border border-slate-200 bg-white px-2 py-2"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_DUTY">On Duty</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAmbulance(ambulance.id)}
                    className="rounded-xl text-red-600 hover:bg-red-50 border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isAssignModalOpen && selectedAmbulanceToAssign && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Assign Driver</h2>
                <p className="text-xs text-red-100 mt-0.5">
                  {selectedAmbulanceToAssign.ambulanceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-[320px] overflow-y-auto space-y-2">
              {availableDrivers.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                  No unassigned drivers available
                </p>
              ) : (
                availableDrivers.map((driver) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => handleAssignDriver(driver.id)}
                    disabled={isSubmitting}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{driver.user?.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedAmbulance && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">
                  Ambulance details
                </p>
                <h2 className="text-2xl font-black mt-1">{selectedAmbulance.ambulanceNumber}</h2>
                <p className="text-sm text-red-100 font-mono mt-1">{selectedAmbulance.plateNumber}</p>
              </div>
              <button type="button" onClick={() => setShowDetails(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-6">
              {[
                { label: 'Fleet Number', value: selectedAmbulance.fleetNumber || '—' },
                { label: 'Status', value: selectedAmbulance.status.replace('_', ' ') },
                { label: 'Type', value: selectedAmbulance.vehicleType || '—' },
                {
                  label: 'Brand / Model / Year',
                  value:
                    [selectedAmbulance.vehicleBrand, selectedAmbulance.vehicleModel, selectedAmbulance.vehicleYear]
                      .filter(Boolean)
                      .join(' · ') || '—',
                },
                { label: 'Readiness', value: `${selectedAmbulance.readinessScore ?? 100}%` },
                { label: 'Base Station', value: selectedAmbulance.station?.name || '—' },
                {
                  label: 'Fuel / Mileage',
                  value: `${selectedAmbulance.fuelLevel ?? '—'}% · ${selectedAmbulance.mileage?.toLocaleString() ?? '—'} km`,
                },
                {
                  label: 'Registration Expiry',
                  value: selectedAmbulance.registrationExpiry
                    ? new Date(selectedAmbulance.registrationExpiry).toLocaleDateString()
                    : '—',
                },
                {
                  label: 'Equipment',
                  value: `${selectedAmbulance.oxygenAvailable ? 'Oxygen' : 'No O₂'} · ${selectedAmbulance.defibrillatorAvailable ? 'AED' : 'No AED'}`,
                },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{row.value}</p>
                </div>
              ))}
              {selectedAmbulance.notes && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedAmbulance.notes}</p>
                </div>
              )}
              {selectedAmbulance.employees && selectedAmbulance.employees.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assigned crew
                  </p>
                  <div className="space-y-2">
                    {selectedAmbulance.employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <User className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{emp.employeeRole?.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex justify-end">
              <Button onClick={() => setShowDetails(false)} className="rounded-xl bg-red-600 hover:bg-red-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
