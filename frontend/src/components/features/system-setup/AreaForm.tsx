'use client'

import React, { useState, useMemo } from 'react'
import { MapPin, Settings, X, Plus, Save, Activity, CheckCircle2, Loader2, AlertTriangle, Building } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AreaFormProps {
  initialData?: {
    id?: string
    name?: string
    districtId?: string
    landmarkDescription?: string
    directionNotes?: string
    accessibilityLevel?: 'EASY' | 'MODERATE' | 'DIFFICULT'
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
    isActive?: boolean
  }
  districts: { id: string; name: string; regionId: string }[]
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function AreaForm({ initialData, districts, onSubmit, onCancel, loading }: AreaFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    districtId: initialData?.districtId ?? '',
    landmarkDescription: initialData?.landmarkDescription ?? '',
    directionNotes: initialData?.directionNotes ?? '',
    accessibilityLevel: initialData?.accessibilityLevel ?? 'MODERATE',
    riskLevel: initialData?.riskLevel ?? 'MEDIUM',
    isActive: initialData?.isActive ?? true,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!formData.name.trim()) newErrors.name = 'Area name is required'
    if (!formData.districtId) newErrors.districtId = 'District is required'
    if (!formData.landmarkDescription.trim()) newErrors.landmarkDescription = 'Landmark is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSubmit = {
      ...formData,
      name: formData.name.trim(),
      landmarkDescription: formData.landmarkDescription.trim(),
      directionNotes: formData.directionNotes.trim(),
    }

    await onSubmit(dataToSubmit)
  }

  const isEditing = !!initialData?.id

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 text-white overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <MapPin className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {isEditing ? 'Edit Area' : 'New Area'}
              </h2>
              <p className="text-red-200/70 text-xs font-medium">
                {isEditing ? 'Update landmark-based location' : 'Create a new sub-area for dispatch'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Area Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Bakara Market North"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              if (errors.name) setErrors({ ...errors, name: undefined })
            }}
            className={cn(
              'w-full h-10 px-3 rounded-xl border text-sm font-medium bg-slate-50 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
              errors.name ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
            )}
          />
          {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight ml-1">{errors.name}</p>}
        </div>

        {/* District Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">District *</label>
          <select
            required
            value={formData.districtId}
            onChange={(e) => {
              setFormData({ ...formData, districtId: e.target.value })
              if (errors.districtId) setErrors({ ...errors, districtId: undefined })
            }}
            className={cn(
              'w-full h-10 px-3 rounded-xl border text-sm font-medium bg-slate-50 outline-none transition-all flex items-center focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400',
              errors.districtId ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
            )}
          >
            <option value="" disabled>Select District</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.districtId && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight ml-1">{errors.districtId}</p>}
        </div>

        {/* Landmark Description & Direction Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Main Landmark *</label>
            <input
              type="text"
              required
              placeholder="e.g. Near Mosque"
              value={formData.landmarkDescription}
              onChange={(e) => setFormData({ ...formData, landmarkDescription: e.target.value })}
              className={cn(
                'w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20',
                errors.landmarkDescription && 'border-red-400'
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Direction Notes</label>
            <input
              type="text"
              placeholder="e.g. Green building behind..."
              value={formData.directionNotes}
              onChange={(e) => setFormData({ ...formData, directionNotes: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </div>

        {/* Risk & Accessibility */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Risk Level</label>
            <select
              value={formData.riskLevel}
              onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20"
            >
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Accessibility</label>
            <select
              value={formData.accessibilityLevel}
              onChange={(e) => setFormData({ ...formData, accessibilityLevel: e.target.value as any })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20"
            >
              <option value="EASY">Easy</option>
              <option value="MODERATE">Moderate</option>
              <option value="DIFFICULT">Difficult</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={cn(
              'w-10 h-6 flex items-center rounded-full p-1 transition-colors',
              formData.isActive ? 'bg-red-500' : 'bg-slate-300'
            )}>
              <div className={cn('bg-white w-4 h-4 rounded-full shadow-sm transition-transform', formData.isActive ? 'translate-x-4' : 'translate-x-0')} />
            </div>
            <input type="checkbox" className="hidden" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Active Area</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEditing ? 'Update Area' : 'Create Area'}
          </button>
        </div>
      </form>
    </div>
  )
}
