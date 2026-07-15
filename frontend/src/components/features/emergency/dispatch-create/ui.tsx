import { ReactNode } from 'react'

export function SectionCard({
  title,
  icon: Icon,
  iconBg,
  children,
  badge,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  children: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function FieldLabel({
  children,
  required,
  error,
}: {
  children: ReactNode
  required?: boolean
  error?: string
}) {
  return (
    <div className="mb-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {children}
        {required && <span className="text-red-500">*</span>}
      </label>
      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-0.5 normal-case tracking-normal">{error}</p>
      )}
    </div>
  )
}

export const inputClass =
  'w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-800 outline-none transition focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 placeholder:text-slate-400'

export function fieldInputClass(error?: string) {
  return error ? `${inputClass} border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-100` : inputClass
}

export function FormActions({
  onCancel,
  onSaveDraft,
  onSubmit,
  submitting,
  submitLabel = 'Submit Request',
}: {
  onCancel: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  submitting: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-12 px-6 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSaveDraft}
        className="h-12 px-6 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        Save Draft
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black uppercase tracking-wide shadow-lg shadow-red-200 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </div>
  )
}
