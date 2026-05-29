'use client'

import { ReactNode } from 'react'
import { X, Lock } from 'lucide-react'

interface DispatcherSlidePanelProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  locked?: boolean
  lockedMessage?: string
  children: ReactNode
  width?: 'md' | 'lg' | 'xl'
}

export default function DispatcherSlidePanel({
  open,
  title,
  subtitle,
  onClose,
  locked = false,
  lockedMessage = 'Sign in with admin-issued dispatcher credentials and start your shift to access this panel.',
  children,
  width = 'lg',
}: DispatcherSlidePanelProps) {
  const widthClass =
    width === 'xl' ? 'max-w-2xl' : width === 'md' ? 'max-w-md' : 'max-w-xl'

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed top-0 right-0 z-[210] h-full w-full ${widthClass} bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-100">Command Panel</p>
            <h2 className="text-xl font-black">{title}</h2>
            {subtitle && <p className="text-sm text-red-100 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {locked ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Access Restricted</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">{lockedMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </aside>
    </>
  )
}
