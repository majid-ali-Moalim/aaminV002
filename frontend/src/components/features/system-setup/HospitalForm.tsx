'use client'

import React, { useState, useMemo } from 'react'
import { Building2, Settings, X, Plus, Save, Activity, CheckCircle2, Loader2, MapPin, Bed, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HospitalFormProps {
  initialData?: {
    id?: string
    name?: string
    regionId?: string
    districtId?: string
    beds?: number
    erReady?: boolean
    status?: string
    color?: string
    isActive?: boolean
  }
  regions: { id: string; name: string }[]
  districts: { id: string; name: string; regionId: string }[]
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function HospitalForm({ initialData, regions, districts, onSubmit, onCancel, loading }: HospitalFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    regionId: initialData?.regionId ?? '',
    districtId: initialData?.districtId ?? '',
    beds: initialData?.beds ?? 0,
    erReady: initialData?.erReady ?? true,
    status: initialData?.status ?? 'Available',
    color: initialData?.color ?? 'red',
    isActive: initialData?.isActive ?? true,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const filteredDistricts = useMemo(() => {
    if (!formData.regionId) return []
    return districts.filter(d => d.regionId === formData.regionId)
  }, [formData.regionId, districts])

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!formData.name.trim()) newErrors.name = 'Hospital name is required'
    if (!formData.regionId) newErrors.regionId = 'Region is required'
    if (!formData.districtId) newErrors.districtId = 'District is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSubmit = {
      ...formData,
      name: formData.name.trim(),
      beds: Number(formData.beds),
    }

    await onSubmit(dataToSubmit)
  }

  const isEditing = !!initialData?.id

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-600 to-red-800 px-6 py-6 text-white overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <Building2 className="w-6 h-6 text-red-50" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-tight">
                {isEditing ? 'Edit Hospital' : 'Register facility'}
              </h2>
              <p className="text-red-100/70 text-xs font-bold uppercase tracking-widest mt-0.5">
                {isEditing ? 'Update facility status' : 'Add new medical center'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-2 hover:bg-white/15 rounded-xl transition-all">
            <X className="w-6 h-6 text-white/80" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="px-8 py-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hospital Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Al-Hayat Speciality Hospital"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              if (errors.name) setErrors({ ...errors, name: undefined })
            }}
            className={cn(
              'w-full h-12 px-4 rounded-2xl border text-sm font-bold bg-slate-50 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500',
              errors.name ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200'
            )}
          />
          {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight ml-1">{errors.name}</p>}
        </div>

        {/* Region & District Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Region *</label>
            <select
              required
              value={formData.regionId}
              onChange={(e) => {
                setFormData({ ...formData, regionId: e.target.value, districtId: '' })
                if (errors.regionId) setErrors({ ...errors, regionId: undefined, districtId: undefined })
              }}
              className={cn(
                'w-full h-12 px-4 rounded-2xl border text-sm font-bold bg-slate-50 outline-none transition-all appearance-none cursor-pointer focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500',
                errors.regionId ? 'border-red-400' : 'border-slate-200'
              )}
            >
              <option value="" disabled>Select Region</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">District *</label>
            <select
              required
              disabled={!formData.regionId}
              value={formData.districtId}
              onChange={(e) => {
                setFormData({ ...formData, districtId: e.target.value })
                if (errors.districtId) setErrors({ ...errors, districtId: undefined })
              }}
              className={cn(
                'w-full h-12 px-4 rounded-2xl border text-sm font-bold bg-slate-50 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500',
                errors.districtId ? 'border-red-400' : 'border-slate-200'
              )}
            >
              <option value="" disabled>Select District</option>
              {filteredDistricts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Capacity & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bed Capacity</label>
            <div className="relative">
              <Bed className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="0"
                value={formData.beds}
                onChange={(e) => setFormData({ ...formData, beds: parseInt(e.target.value) || 0 })}
                className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-200 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-red-500/10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Availability Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:ring-4 focus:ring-red-500/10"
            >
              <option value="Available">Available</option>
              <option value="Limited">Limited</option>
              <option value="Full">Full / No Entry</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-red-200 transition-all">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
              formData.erReady ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-400'
            )}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-700">ER Ready Status</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Can receive critical patients</p>
            </div>
            <input type="checkbox" className="hidden" checked={formData.erReady} onChange={e => setFormData({...formData, erReady: e.target.checked})} />
            <div className={cn('w-10 h-6 rounded-full p-1 transition-colors', formData.erReady ? 'bg-red-500' : 'bg-slate-300')}>
              <div className={cn('bg-white w-4 h-4 rounded-full shadow-sm transition-transform', formData.erReady ? 'translate-x-4' : 'translate-x-0')} />
            </div>
          </label>

          <label className="flex items-center gap-4 cursor-pointer group bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-red-200 transition-all">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
              formData.isActive ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-400'
            )}>
              <Activity className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-700">Operational Active</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Visible for dispatching</p>
            </div>
            <input type="checkbox" className="hidden" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <div className={cn('w-10 h-6 rounded-full p-1 transition-colors', formData.isActive ? 'bg-red-500' : 'bg-slate-300')}>
              <div className={cn('bg-white w-4 h-4 rounded-full shadow-sm transition-transform', formData.isActive ? 'translate-x-4' : 'translate-x-0')} />
            </div>
          </label>
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 h-12 rounded-2xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
          <button type="submit" disabled={loading} className="flex-2 h-12 rounded-2xl bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-700 hover:shadow-red-700/40 transition-all flex items-center justify-center gap-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isEditing ? 'Update facility' : 'Register Hospital'}
          </button>
        </div>
      </form>
    </div>
  )
}
