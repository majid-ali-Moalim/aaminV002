'use client'

import React, { useState } from 'react'
import { UserCog, Settings, X, Plus, Save, Activity, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmployeeRoleFormProps {
  initialData?: {
    id?: string
    name?: string
    description?: string
    isActive?: boolean
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function EmployeeRoleForm({ initialData, onSubmit, onCancel, loading }: EmployeeRoleFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    isActive: initialData?.isActive ?? true,
  })
  const [errors, setErrors] = useState<{ name?: string }>({})

  const validate = () => {
    const newErrors: { name?: string } = {}
    if (!formData.name.trim()) newErrors.name = 'Role name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const dataToSubmit: any = {
      name: formData.name.trim(),
      isActive: formData.isActive,
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
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 text-white overflow-hidden">
        {/* decorative blob */}
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute right-12 top-8 w-12 h-12 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <UserCog className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {isEditing ? 'Edit Role' : 'New Employee Role'}
              </h2>
              <p className="text-red-200/70 text-xs font-medium">
                {isEditing ? 'Update role classification' : 'Add a new professional role to the registry'}
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
      <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">

        {/* Role Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Senior Nurse, Senior Driver"
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
              <span>⚠</span> {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Description <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Brief description of responsibilities..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-700 outline-none resize-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          />
        </div>

        {/* Active Status Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-1.5 rounded-lg transition-colors',
              formData.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
            )}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Active Status</p>
              <p className="text-xs text-slate-400">Role is {formData.isActive ? 'available for assignment' : 'archived / hidden'}</p>
            </div>
          </div>

          {/* Toggle */}
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
                Update Role
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Role
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
