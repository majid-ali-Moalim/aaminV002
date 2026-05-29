'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, Settings, X, Plus, Save, Activity, CheckCircle2, Loader2, Clock, AlertTriangle, Users, Building, Stethoscope, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedDistrictFormProps {
  initialData?: {
    id?: string
    name?: string
    code?: string
    regionId?: string
    description?: string
    isActive?: boolean
    coverageAreaType?: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED'
    populationEstimate?: number
    commonLandmarks?: string
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    averageResponseTime?: number
    trafficCondition?: 'LIGHT' | 'MODERATE' | 'HEAVY'
    assignedStations?: string[]
    nearbyHospitals?: string[]
    ambulanceCoverageCount?: number
    notes?: string
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
  regions?: Array<{ id: string; name: string }>
  stations?: Array<{ id: string; name: string }>
  hospitals?: Array<{ id: string; name: string }>
}

export default function AdvancedDistrictForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading, 
  regions = [],
  stations = [],
  hospitals = []
}: AdvancedDistrictFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    code: initialData?.code ?? '',
    regionId: initialData?.regionId ?? '',
    description: initialData?.description ?? '',
    isActive: initialData?.isActive ?? true,
    coverageAreaType: (initialData?.coverageAreaType as 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED') ?? 'MIXED',
    populationEstimate: initialData?.populationEstimate ?? 0,
    commonLandmarks: initialData?.commonLandmarks ?? '',
    riskLevel: (initialData?.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') ?? 'MEDIUM',
    averageResponseTime: initialData?.averageResponseTime ?? 15,
    trafficCondition: (initialData?.trafficCondition as 'LIGHT' | 'MODERATE' | 'HEAVY') ?? 'MODERATE',
    assignedStations: initialData?.assignedStations ?? [],
    nearbyHospitals: initialData?.nearbyHospitals ?? [],
    ambulanceCoverageCount: initialData?.ambulanceCoverageCount ?? 0,
    notes: initialData?.notes ?? '',
  })
  const [errors, setErrors] = useState<{ name?: string; regionId?: string; averageResponseTime?: string }>({})

  const validate = () => {
    const newErrors: { name?: string; regionId?: string; averageResponseTime?: string } = {}
    if (!formData.name.trim()) newErrors.name = 'District name is required'
    if (!formData.regionId) newErrors.regionId = 'Region selection is required'
    if (formData.averageResponseTime < 1 || formData.averageResponseTime > 120) {
      newErrors.averageResponseTime = 'Response time must be between 1-120 minutes'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSubmit: any = {
      name: formData.name.trim(),
      regionId: formData.regionId,
      isActive: formData.isActive,
      coverageAreaType: formData.coverageAreaType,
      populationEstimate: formData.populationEstimate,
      commonLandmarks: formData.commonLandmarks.trim() || null,
      riskLevel: formData.riskLevel,
      averageResponseTime: formData.averageResponseTime,
      trafficCondition: formData.trafficCondition,
      assignedStations: formData.assignedStations,
      nearbyHospitals: formData.nearbyHospitals,
      ambulanceCoverageCount: formData.ambulanceCoverageCount,
      notes: formData.notes.trim() || null,
    }

    if (formData.code.trim()) {
      dataToSubmit.code = formData.code.trim()
    } else {
      dataToSubmit.code = null
    }

    if (formData.description.trim()) {
      dataToSubmit.description = formData.description.trim()
    } else {
      dataToSubmit.description = null 
    }

    await onSubmit(dataToSubmit)
  }

  const isEditing = !!initialData?.id

  const handleStationToggle = (stationId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedStations: prev.assignedStations.includes(stationId)
        ? prev.assignedStations.filter(id => id !== stationId)
        : [...prev.assignedStations, stationId]
    }))
  }

  const handleHospitalToggle = (hospitalId: string) => {
    setFormData(prev => ({
      ...prev,
      nearbyHospitals: prev.nearbyHospitals.includes(hospitalId)
        ? prev.nearbyHospitals.filter(id => id !== hospitalId)
        : [...prev.nearbyHospitals, hospitalId]
    }))
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 text-white overflow-hidden">
        {/* decorative blob */}
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute right-12 top-8 w-12 h-12 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <MapPin className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {isEditing ? 'Edit District' : 'New District'}
              </h2>
              <p className="text-red-200/70 text-xs font-medium">
                {isEditing ? 'Update district details' : 'Add a new district to the system'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-6">
        
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* District Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                District Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hamar Weyne, Boondheere"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({})
                }}
                className={cn(
                  'w-full h-10 px-3 rounded-xl border text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all',
                  'placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
                  errors.name ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
                )}
              />
              {errors.name && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <span>!</span> {errors.name}
                </p>
              )}
            </div>

            {/* District Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                District Code <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. HW-01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={10}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest bg-slate-50 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 uppercase"
              />
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Region <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.regionId}
                onChange={(e) => {
                  setFormData({ ...formData, regionId: e.target.value })
                  if (errors.regionId) setErrors({})
                }}
                className={cn(
                  'w-full h-10 px-3 rounded-xl border text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all',
                  'focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
                  errors.regionId ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
                )}
              >
                <option value="">Select a region</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
              {errors.regionId && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <span>!</span> {errors.regionId}
                </p>
              )}
            </div>

            {/* Active Status Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    formData.isActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formData.isActive ? 'Visible in system' : 'Archived'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30',
                    formData.isActive ? 'bg-red-500' : 'bg-slate-300'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Description <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of this district..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-700 outline-none resize-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
        </div>

        {/* Location Details Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Map className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Location Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coverage Area Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Coverage Area Type
              </label>
              <select
                value={formData.coverageAreaType}
                onChange={(e) => setFormData({ ...formData, coverageAreaType: e.target.value as 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            {/* Population Estimate */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Population Estimate <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  placeholder="Estimated population"
                  value={formData.populationEstimate}
                  onChange={(e) => setFormData({ ...formData, populationEstimate: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
          </div>

          {/* Common Landmarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Common Landmarks <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Central Mosque, Market Square, Police Station"
              value={formData.commonLandmarks}
              onChange={(e) => setFormData({ ...formData, commonLandmarks: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-700 outline-none resize-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
        </div>

        {/* Dispatch Intelligence Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dispatch Intelligence</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Risk Level
              </label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' })}
                className={cn(
                  'w-full h-10 px-3 rounded-xl border text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all',
                  'focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 border-slate-200'
                )}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Average Response Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Average Response Time (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.averageResponseTime}
                  onChange={(e) => {
                    setFormData({ ...formData, averageResponseTime: parseInt(e.target.value) || 15 })
                    if (errors.averageResponseTime) setErrors({})
                  }}
                  className={cn(
                    'w-full h-10 pl-10 pr-3 rounded-xl border text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all',
                    'placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
                    errors.averageResponseTime ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
                  )}
                />
              </div>
              {errors.averageResponseTime && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <span>!</span> {errors.averageResponseTime}
                </p>
              )}
            </div>

            {/* Traffic Condition */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Traffic Condition
              </label>
              <select
                value={formData.trafficCondition}
                onChange={(e) => setFormData({ ...formData, trafficCondition: e.target.value as 'LIGHT' | 'MODERATE' | 'HEAVY' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="LIGHT">Light</option>
                <option value="MODERATE">Moderate</option>
                <option value="HEAVY">Heavy</option>
              </select>
            </div>

            {/* Ambulance Coverage Count */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Ambulance Coverage Count
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  value={formData.ambulanceCoverageCount}
                  onChange={(e) => setFormData({ ...formData, ambulanceCoverageCount: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resource Mapping Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Resource Mapping</h3>
          </div>

          {/* Assigned Stations */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Assigned Stations <span className="text-slate-400 font-normal normal-case ml-1">(multi-select)</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2">
              {stations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No stations available</p>
              ) : (
                <div className="space-y-1">
                  {stations.map(station => (
                    <label
                      key={station.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignedStations.includes(station.id)}
                        onChange={() => handleStationToggle(station.id)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                      />
                      <span className="text-sm font-medium text-slate-700">{station.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nearby Hospitals */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Nearby Hospitals <span className="text-slate-400 font-normal normal-case ml-1">(multi-select)</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2">
              {hospitals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No hospitals available</p>
              ) : (
                <div className="space-y-1">
                  {hospitals.map(hospital => (
                    <label
                      key={hospital.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.nearbyHospitals.includes(hospital.id)}
                        onChange={() => handleHospitalToggle(hospital.id)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                      />
                      <span className="text-sm font-medium text-slate-700">{hospital.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Notes <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Additional notes about this district..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-700 outline-none resize-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-1" />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'flex-1 h-10 rounded-xl text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2',
              loading
                ? 'bg-red-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25 active:scale-[0.98]'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Update District
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create District
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
