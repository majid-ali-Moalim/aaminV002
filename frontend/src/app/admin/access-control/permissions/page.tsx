'use client'

import { useState } from 'react'
import { Key, Search, AlertTriangle } from 'lucide-react'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import {
  PERMISSION_CATALOG,
  ALL_PERMISSIONS,
} from '@/lib/accessControlCatalog'

export default function PermissionsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCatalog = PERMISSION_CATALOG.map((cat) => ({
    ...cat,
    permissions: cat.permissions.filter(
      (p) =>
        p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.key.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  })).filter((cat) => cat.permissions.length > 0)

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Master Catalog"
        title="Permissions"
        subtitle="System permission keys enforced by API role guards — drivers, nurses, ambulances, dispatch, reports, and administration."
        icon={Key}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Permissions', value: ALL_PERMISSIONS.length },
          { label: 'Categories', value: PERMISSION_CATALOG.length },
          { label: 'Sensitive Actions', value: ALL_PERMISSIONS.filter((p) => p.sensitive).length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-black text-red-600 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search permissions…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredCatalog.map((cat) => {
          const Icon = cat.icon
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">{cat.category}</h2>
                <span className="text-xs text-slate-400 ml-auto">{cat.permissions.length} permissions</span>
              </div>
              <div className="divide-y divide-slate-100">
                {cat.permissions.map((perm) => (
                  <div key={perm.key} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-red-50/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{perm.label}</p>
                        {perm.sensitive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> Sensitive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{perm.key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
