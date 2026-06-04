'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavModule } from '@/lib/dispatcher/navigation'
import { moduleHref } from '@/lib/dispatcher/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'

interface Props {
  module: NavModule
  description?: string
  children: React.ReactNode
}

export default function DispatcherModuleShell({ module, description, children }: Props) {
  const pathname = usePathname()

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{module.label}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <nav className="flex gap-1 min-w-max bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {module.items.map((item) => {
            const href = moduleHref(module, item.slug)
            const active = pathname === href
            return (
              <Link
                key={item.slug}
                href={href}
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  )
}

export function DispatcherPanel({
  title,
  children,
  empty,
}: {
  title?: string
  children: React.ReactNode
  empty?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700">{title}</h2>
        </div>
      )}
      <div className="p-5">
        {empty ? <p className="text-sm text-gray-400 text-center py-8">{empty}</p> : children}
      </div>
    </div>
  )
}

export function EmergencyTable({ items, onAssign }: { items: any[]; onAssign?: (item: any) => void }) {
  if (!items?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold uppercase text-gray-400 border-b border-gray-100">
            <th className="pb-3 pr-4">Code</th>
            <th className="pb-3 pr-4">Patient</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Priority</th>
            <th className="pb-3 pr-4">Location</th>
            {onAssign && <th className="pb-3">Action</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0">
              <td className="py-3 pr-4 font-bold text-gray-900">{r.trackingCode}</td>
              <td className="py-3 pr-4 text-gray-600">{r.patient?.fullName || '—'}</td>
              <td className="py-3 pr-4">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {r.status}
                </span>
              </td>
              <td className="py-3 pr-4 font-bold text-red-600">{r.priority}</td>
              <td className="py-3 pr-4 text-gray-500 max-w-[200px] truncate">{r.pickupLocation}</td>
              {onAssign && r.status === 'PENDING' && (
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => onAssign(r)}
                    className="text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    Assign
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AmbulanceGrid({ items }: { items: any[] }) {
  if (!items?.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <div key={a.id} className="border border-gray-200 rounded-xl p-4 hover:border-red-200 transition-colors">
          <p className="font-black text-gray-900">{a.ambulanceNumber}</p>
          <p className="text-xs text-gray-500">{a.plateNumber}</p>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100">
            {a.status}
          </span>
          {a.station?.name && <p className="text-[10px] text-gray-400 mt-1">{a.station.name}</p>}
        </div>
      ))}
    </div>
  )
}

export function CrewGrid({ items }: { items: any[] }) {
  if (!items?.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => (
        <div key={e.id} className="border border-gray-200 rounded-xl p-4">
          <p className="font-bold text-gray-900">
            {e.firstName} {e.lastName}
          </p>
          <p className="text-xs text-gray-500">{e.employeeRole?.name || 'Staff'}</p>
          <span className="inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            {e.shiftStatus}
          </span>
        </div>
      ))}
    </div>
  )
}

export function HospitalGrid({ items }: { items: any[] }) {
  if (!items?.length) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((h) => (
        <div key={h.id} className="border border-gray-200 rounded-xl p-4">
          <p className="font-black text-gray-900">{h.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {h.district?.name || h.region?.name || '—'} · {h.beds} beds
          </p>
          <span
            className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              h.erReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {h.status}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PlaceholderView({ title, hint }: { title: string; hint?: string }) {
  return (
    <DispatcherPanel title={title}>
      <p className="text-sm text-gray-500">
        {hint ||
          'This operational view is connected to the dispatch command center. Data will populate as missions and fleet activity are recorded in the system.'}
      </p>
    </DispatcherPanel>
  )
}
