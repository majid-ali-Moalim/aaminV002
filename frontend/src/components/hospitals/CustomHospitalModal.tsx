'use client'

import { useState } from 'react'
import { Building2, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export type CustomHospitalDraft = {
  name: string
  branchName: string
  address: string
  branchAddress: string
  primaryPhone: string
}

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (draft: CustomHospitalDraft) => Promise<void>
  title?: string
  hint?: string
}

export function CustomHospitalModal({
  open,
  onClose,
  onCreate,
  title = 'Add custom hospital',
  hint = 'Enter the hospital name and branch now. You can edit full details later in Hospital Coordination.',
}: Props) {
  const [draft, setDraft] = useState<CustomHospitalDraft>({
    name: '',
    branchName: '',
    address: '',
    branchAddress: '',
    primaryPhone: '',
  })
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const set = (patch: Partial<CustomHospitalDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) {
      toast.error('Hospital name is required')
      return
    }
    setSaving(true)
    try {
      await onCreate({
        ...draft,
        // Address is required by the backend — fall back to branch or name.
        address: draft.address.trim() || draft.branchName.trim() || draft.name.trim(),
      })
      onClose()
      setDraft({ name: '', branchName: '', address: '', branchAddress: '', primaryPhone: '' })
    } catch (err) {
      const apiMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined
      const text = Array.isArray(apiMessage)
        ? apiMessage.join(', ')
        : apiMessage || (err instanceof Error ? err.message : undefined)
      toast.error(text || 'Failed to create hospital')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500">{hint}</p>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Hospital name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Al Shifa Hospital"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Branch / Location name
            </label>
            <input
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              value={draft.branchName}
              onChange={(e) => set({ branchName: e.target.value })}
              placeholder="e.g. Hodan Branch"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                value={draft.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="Street / area"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                value={draft.primaryPhone}
                onChange={(e) => set({ primaryPhone: e.target.value })}
                placeholder="+2526..."
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create & select
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
