'use client'

import { Phone, Radio, AlertTriangle, Users } from 'lucide-react'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

const CONTACTS = [
  { label: 'Emergency Hotline', value: '+252 XX XXXXXXX', icon: AlertTriangle },
  { label: 'Dispatch Supervisor', value: '+252 XX XXXXXXX', icon: Radio },
  { label: 'Hospital Coordination', value: '+252 XX XXXXXXX', icon: Users },
  { label: 'Fleet Operations', value: '+252 XX XXXXXXX', icon: Phone },
]

export default function DispatcherCommunicationsPage() {
  const { profile, isAuthorized } = useDispatcherAccess()

  if (!isAuthorized) return null

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Communications</h1>
        <p className="text-sm text-slate-500 mt-1">Key contacts for dispatch coordination</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CONTACTS.map((c) => (
          <a
            key={c.label}
            href={`tel:${c.value.replace(/\s/g, '')}`}
            className="bg-white rounded-2xl border border-red-50 p-5 hover:border-red-200 hover:shadow-md transition-all flex items-start gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <c.icon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-black text-slate-900">{c.label}</p>
              <p className="text-sm text-red-600 font-bold mt-1">{c.value}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="rounded-2xl bg-red-50 border border-red-100 p-6">
        <p className="text-xs font-black uppercase text-red-600 tracking-widest">Your station</p>
        <p className="text-lg font-black text-slate-900 mt-1">{profile?.station?.name || 'Not assigned'}</p>
        <p className="text-sm text-slate-600 mt-1">{profile?.department?.name || 'Dispatch Operations'}</p>
        {profile?.phone && (
          <p className="text-sm text-slate-500 mt-3">Your line: <strong>+252 {profile.phone}</strong></p>
        )}
      </div>
    </div>
  )
}
