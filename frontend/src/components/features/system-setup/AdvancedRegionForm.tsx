'use client'

import React, { useState } from 'react'
import { MapPin, Settings, X, Plus, Save, Activity, CheckCircle2, Loader2, Clock, AlertTriangle, User, Building, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedRegionFormProps {
  initialData?: {
    id?: string
    name?: string
    code?: string
    description?: string
    country?: string
    isActive?: boolean
    coverageType?: 'URBAN' | 'RURAL' | 'MIXED'
    emergencyPriorityLevel?: 'HIGH' | 'MEDIUM' | 'LOW'
    defaultResponseTime?: number
    assignedRegionalManager?: string
    numberOfStations?: number
    numberOfAmbulances?: number
    notes?: string
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function AdvancedRegionForm({ initialData, onSubmit, onCancel, loading }: AdvancedRegionFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    code: initialData?.code ?? '',
    description: initialData?.description ?? '',
    country: initialData?.country ?? 'Somalia',
    isActive: initialData?.isActive ?? true,
    coverageType: (initialData?.coverageType as 'URBAN' | 'RURAL' | 'MIXED') ?? 'MIXED',
    emergencyPriorityLevel: (initialData?.emergencyPriorityLevel as 'HIGH' | 'MEDIUM' | 'LOW') ?? 'MEDIUM',
    defaultResponseTime: initialData?.defaultResponseTime ?? 15,
    assignedRegionalManager: initialData?.assignedRegionalManager ?? '',
    numberOfStations: initialData?.numberOfStations ?? 0,
    numberOfAmbulances: initialData?.numberOfAmbulances ?? 0,
    notes: initialData?.notes ?? '',
  })
  const [errors, setErrors] = useState<{ name?: string; defaultResponseTime?: string }>({})

  const validate = () => {
    const newErrors: { name?: string; defaultResponseTime?: string } = {}
    if (!formData.name.trim()) newErrors.name = 'Region name is required'
    if (formData.defaultResponseTime < 1 || formData.defaultResponseTime > 120) {
      newErrors.defaultResponseTime = 'Response time must be between 1-120 minutes'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSubmit: any = {
      name: formData.name.trim(),
      country: formData.country.trim(),
      isActive: formData.isActive,
      coverageType: formData.coverageType,
      emergencyPriorityLevel: formData.emergencyPriorityLevel,
      defaultResponseTime: formData.defaultResponseTime,
      assignedRegionalManager: formData.assignedRegionalManager.trim() || null,
      numberOfStations: formData.numberOfStations,
      numberOfAmbulances: formData.numberOfAmbulances,
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

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
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
                {isEditing ? 'Edit Region' : 'New Region'}
              </h2>
              <p className="text-red-200/70 text-xs font-medium">
                {isEditing ? 'Update regional details' : 'Add a new region to the system'}
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
            {/* Region Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Region Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Banadir, Jubbaland"
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

            {/* Region Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Region Code <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BNDR"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={10}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest bg-slate-50 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 uppercase"
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
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
              placeholder="Brief description of this region..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-700 outline-none resize-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
        </div>

        {/* Operational Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Settings className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Operational Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coverage Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Coverage Type
              </label>
              <select
                value={formData.coverageType}
                onChange={(e) => setFormData({ ...formData, coverageType: e.target.value as 'URBAN' | 'RURAL' | 'MIXED' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="URBAN">Urban</option>
                <option value="RURAL">Rural</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            {/* Emergency Priority Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Emergency Priority Level
              </label>
              <select
                value={formData.emergencyPriorityLevel}
                onChange={(e) => setFormData({ ...formData, emergencyPriorityLevel: e.target.value as 'HIGH' | 'MEDIUM' | 'LOW' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Default Response Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Default Response Time (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.defaultResponseTime}
                  onChange={(e) => {
                    setFormData({ ...formData, defaultResponseTime: parseInt(e.target.value) || 15 })
                    if (errors.defaultResponseTime) setErrors({})
                  }}
                  className={cn(
                    'w-full h-10 pl-10 pr-3 rounded-xl border text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all',
                    'placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
                    errors.defaultResponseTime ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
                  )}
                />
              </div>
              {errors.defaultResponseTime && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <span>!</span> {errors.defaultResponseTime}
                </p>
              )}
            </div>

            {/* Assigned Regional Manager */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Regional Manager <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Manager name"
                  value={formData.assignedRegionalManager}
                  onChange={(e) => setFormData({ ...formData, assignedRegionalManager: e.target.value })}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Management Fields Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Management Fields</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Number of Stations */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Number of Stations
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  value={formData.numberOfStations}
                  onChange={(e) => setFormData({ ...formData, numberOfStations: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>

            {/* Number of Ambulances */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Number of Ambulances
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  value={formData.numberOfAmbulances}
                  onChange={(e) => setFormData({ ...formData, numberOfAmbulances: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Notes <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Additional notes about this region..."
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
                Update Region
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Region
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
