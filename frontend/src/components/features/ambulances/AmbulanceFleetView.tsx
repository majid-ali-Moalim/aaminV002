'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Truck,
  MapPin,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Wind,
  HeartPulse,
  Gauge,
  Droplet,
  Warehouse,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ambulancesService, systemSetupService } from '@/lib/api'
import { Ambulance, AmbulanceStatus, Station } from '@/types'
import {
  ADMIN_AMBULANCE_STATUS_OPTIONS,
  getAdminAmbulanceStatusValue,
  getAmbulanceStatusStyles,
  isAmbulanceAvailable,
  isAmbulanceUnavailable,
} from '@/lib/ambulance/status'

const UNAVAILABLE_FILTER = '__UNAVAILABLE__'

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300'

const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block'

type EditAmbulanceForm = {
  ambulanceNumber: string
  plateNumber: string
  fleetNumber: string
  vehicleType: string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: string
  status: AmbulanceStatus
  stationId: string
  regionId: string
  districtId: string
  oxygenAvailable: boolean
  defibrillatorAvailable: boolean
  registrationExpiry: string
  fuelLevel: string
  mileage: string
  notes: string
}

function buildEditForm(ambulance: Ambulance): EditAmbulanceForm {
  return {
    ambulanceNumber: ambulance.ambulanceNumber ?? '',
    plateNumber: ambulance.plateNumber ?? '',
    fleetNumber: ambulance.fleetNumber ?? '',
    vehicleType: ambulance.vehicleType ?? '',
    vehicleBrand: ambulance.vehicleBrand ?? '',
    vehicleModel: ambulance.vehicleModel ?? '',
    vehicleYear: ambulance.vehicleYear != null ? String(ambulance.vehicleYear) : '',
    status: getAdminAmbulanceStatusValue(ambulance.status) as AmbulanceStatus,
    stationId: ambulance.stationId ?? '',
    regionId: ambulance.regionId ?? '',
    districtId: ambulance.districtId ?? '',
    oxygenAvailable: Boolean(ambulance.oxygenAvailable),
    defibrillatorAvailable: Boolean(ambulance.defibrillatorAvailable),
    registrationExpiry: ambulance.registrationExpiry
      ? ambulance.registrationExpiry.slice(0, 10)
      : '',
    fuelLevel: ambulance.fuelLevel != null ? String(ambulance.fuelLevel) : '',
    mileage: ambulance.mileage != null ? String(ambulance.mileage) : '',
    notes: ambulance.notes ?? '',
  }
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
  compact?: boolean
}

export default function AmbulanceFleetView({
  title,
  subtitle,
  heroBadge = 'Ambulance Management',
  presetStatuses,
  hideStatusFilter = false,
  showRegisterButton = true,
  emptyTitle = 'No ambulances found',
  emptyDescription = 'Try adjusting filters or register a new unit',
  compact = false,
}: AmbulanceFleetViewConfig) {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stations, setStations] = useState<Station[]>([])
  const [editAmbulance, setEditAmbulance] = useState<Ambulance | null>(null)
  const [editForm, setEditForm] = useState<EditAmbulanceForm | null>(null)
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

  const fetchStations = useCallback(async () => {
    try {
      const data = await systemSetupService.getStations()
      setStations(data)
    } catch (err) {
      console.error('Error fetching stations:', err)
    }
  }, [])

  useEffect(() => {
    fetchAmbulances(true)
    fetchStations()
    const interval = setInterval(() => fetchAmbulances(false), 10000)
    return () => clearInterval(interval)
  }, [fetchAmbulances, fetchStations])

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
    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'AVAILABLE' && isAmbulanceAvailable(ambulance.status)) ||
      (statusFilter === UNAVAILABLE_FILTER && isAmbulanceUnavailable(ambulance.status))
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: scopedAmbulances.length,
    available: scopedAmbulances.filter((a) => isAmbulanceAvailable(a.status)).length,
    unavailable: scopedAmbulances.filter((a) => isAmbulanceUnavailable(a.status)).length,
    unavailableOnDuty: scopedAmbulances.filter((a) => a.status === 'ON_DUTY').length,
  }

  const openEditModal = (ambulance: Ambulance) => {
    setEditAmbulance(ambulance)
    setEditForm(buildEditForm(ambulance))
  }

  const closeEditModal = () => {
    setEditAmbulance(null)
    setEditForm(null)
  }

  const setEditField = <K extends keyof EditAmbulanceForm>(key: K, value: EditAmbulanceForm[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSaveEdit = async () => {
    if (!editAmbulance || !editForm) return
    if (!editForm.stationId) {
      toast.error('Base station is required')
      return
    }

    try {
      setIsSubmitting(true)
      const station = stations.find((s) => s.id === editForm.stationId)
      await ambulancesService.update(editAmbulance.id, {
        ambulanceNumber: editForm.ambulanceNumber.trim(),
        plateNumber: editForm.plateNumber.trim(),
        fleetNumber: editForm.fleetNumber.trim() || null,
        vehicleType: editForm.vehicleType.trim() || null,
        vehicleBrand: editForm.vehicleBrand.trim() || null,
        vehicleModel: editForm.vehicleModel.trim() || null,
        vehicleYear: editForm.vehicleYear ? Number(editForm.vehicleYear) : null,
        status: editForm.status,
        stationId: editForm.stationId,
        regionId: station?.regionId || editForm.regionId || null,
        districtId: station?.districtId || editForm.districtId || null,
        oxygenAvailable: editForm.oxygenAvailable,
        defibrillatorAvailable: editForm.defibrillatorAvailable,
        registrationExpiry: editForm.registrationExpiry
          ? new Date(editForm.registrationExpiry).toISOString()
          : null,
        fuelLevel: editForm.fuelLevel ? Number(editForm.fuelLevel) : null,
        mileage: editForm.mileage ? Number(editForm.mileage) : null,
        notes: editForm.notes.trim() || null,
      })
      toast.success(`Ambulance ${editForm.ambulanceNumber} updated`)
      closeEditModal()
      fetchAmbulances(false)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update ambulance'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await ambulancesService.updateStatus(id, status)
      fetchAmbulances(false)
    } catch {
      alert('Failed to update status')
    }
  }

  const handleDeleteAmbulance = async (id: string) => {
    if (!confirm('Delete this ambulance?')) return
    try {
      await ambulancesService.delete(id)
      fetchAmbulances(false)
    } catch {
      alert('Failed to delete ambulance')
    }
  }

  return (
    <div className={compact ? 'space-y-6' : 'p-6 max-w-[1600px] mx-auto space-y-6 pb-12'}>
      {!compact && (
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: presetStatuses ? 'Units Shown' : 'Total Ambulance', value: stats.total, icon: Truck, color: 'text-red-600 bg-red-50' },
          { label: 'Available', value: stats.available, icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
          {
            label: 'Unavailable',
            value: stats.unavailable,
            sub: stats.unavailableOnDuty > 0 ? `${stats.unavailableOnDuty} on duty` : undefined,
            icon: MapPin,
            color: 'text-slate-600 bg-slate-100',
          },
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
                {'sub' in item && item.sub && (
                  <p className="text-[10px] font-semibold text-slate-500 mt-1">{item.sub}</p>
                )}
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
            <option value={UNAVAILABLE_FILTER}>Unavailable</option>
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
          <p className="text-sm font-semibold text-slate-500">Loading ambulances…</p>
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
            const style = getAmbulanceStatusStyles(ambulance.status)
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

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Driver and nurse are assigned per case from the{' '}
                      <span className="font-semibold">Dispatch Assign Team</span> form — not on the
                      ambulance record.
                    </p>
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
                    onClick={() => openEditModal(ambulance)}
                    className="rounded-xl flex-1 min-w-[80px]"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <select
                    value={getAdminAmbulanceStatusValue(ambulance.status)}
                    onChange={(e) => handleUpdateStatus(ambulance.id, e.target.value)}
                    disabled={ambulance.status === 'ON_DUTY'}
                    title={
                      ambulance.status === 'ON_DUTY'
                        ? 'Status is set automatically while on duty'
                        : undefined
                    }
                    className="flex-1 min-w-[100px] text-xs font-semibold rounded-xl border border-slate-200 bg-white px-2 py-2 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {ADMIN_AMBULANCE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
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

      {editAmbulance && editForm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white flex items-start justify-between gap-4 sticky top-0 z-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-200">
                  Edit ambulance
                </p>
                <h2 className="text-2xl font-black mt-1">{editAmbulance.ambulanceNumber}</h2>
                <p className="text-sm text-red-100 font-mono mt-1">{editAmbulance.plateNumber}</p>
              </div>
              <button type="button" onClick={closeEditModal} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ambulance ID</label>
                  <input
                    className={inputClass}
                    value={editForm.ambulanceNumber}
                    onChange={(e) => setEditField('ambulanceNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Plate Number</label>
                  <input
                    className={inputClass}
                    value={editForm.plateNumber}
                    onChange={(e) => setEditField('plateNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fleet Number</label>
                  <input
                    className={inputClass}
                    value={editForm.fleetNumber}
                    onChange={(e) => setEditField('fleetNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Base Station *</label>
                  <select
                    className={inputClass}
                    value={editForm.stationId}
                    onChange={(e) => {
                      const station = stations.find((s) => s.id === e.target.value)
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              stationId: e.target.value,
                              regionId: station?.regionId || prev.regionId,
                              districtId: station?.districtId || prev.districtId,
                            }
                          : prev,
                      )
                    }}
                  >
                    <option value="">Select base station</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Vehicle Type</label>
                  <input
                    className={inputClass}
                    value={editForm.vehicleType}
                    onChange={(e) => setEditField('vehicleType', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Brand</label>
                  <input
                    className={inputClass}
                    value={editForm.vehicleBrand}
                    onChange={(e) => setEditField('vehicleBrand', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Model</label>
                  <input
                    className={inputClass}
                    value={editForm.vehicleModel}
                    onChange={(e) => setEditField('vehicleModel', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Year</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={editForm.vehicleYear}
                    onChange={(e) => setEditField('vehicleYear', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={inputClass}
                    value={editForm.status}
                    disabled={editAmbulance.status === 'ON_DUTY'}
                    onChange={(e) => setEditField('status', e.target.value as AmbulanceStatus)}
                  >
                    {ADMIN_AMBULANCE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Registration Expiry</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={editForm.registrationExpiry}
                    onChange={(e) => setEditField('registrationExpiry', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fuel Level (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputClass}
                    value={editForm.fuelLevel}
                    onChange={(e) => setEditField('fuelLevel', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mileage (km)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={editForm.mileage}
                    onChange={(e) => setEditField('mileage', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.oxygenAvailable}
                    onChange={(e) => setEditField('oxygenAvailable', e.target.checked)}
                    className="rounded text-red-600"
                  />
                  Oxygen available
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.defibrillatorAvailable}
                    onChange={(e) => setEditField('defibrillatorAvailable', e.target.checked)}
                    className="rounded text-red-600"
                  />
                  Defibrillator available
                </label>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={editForm.notes}
                  onChange={(e) => setEditField('notes', e.target.value)}
                />
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">
                  Crew assignment is handled in dispatch when you assign a case — not here.
                </p>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-slate-100">
              <Button variant="outline" onClick={closeEditModal} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 hover:bg-red-700 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
