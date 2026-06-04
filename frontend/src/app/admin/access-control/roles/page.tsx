'use client'

import { useState, useEffect, useMemo } from 'react'
import { Shield, Search, Users, Loader2 } from 'lucide-react'
import AccessControlHero from '@/components/features/access-control/AccessControlHero'
import { employeesService, systemSetupService } from '@/lib/api'

type EmployeeRole = {
  id: string
  name: string
  description?: string | null
  isActive: boolean
}

export default function RolesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roles, setRoles] = useState<EmployeeRole[]>([])
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [rolesData, employees] = await Promise.all([
          systemSetupService.getRoles(),
          employeesService.getAll(),
        ])
        setRoles(Array.isArray(rolesData) ? rolesData : [])
        const counts: Record<string, number> = {}
        for (const emp of employees) {
          const roleId = emp.employeeRoleId
          if (roleId) counts[roleId] = (counts[roleId] ?? 0) + 1
        }
        setRoleCounts(counts)
      } catch (err) {
        console.error(err)
        setError('Failed to load roles from the database.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [roles, searchTerm],
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <AccessControlHero
        badge="Role Definitions"
        title="Roles"
        subtitle="Employee roles for staff only — Dispatcher, Driver, Nurse, Supervisor, and Administrator. Patient accounts have no system permissions."
        icon={Shield}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading roles…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500">
          No employee roles found in the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all"
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-lg">{role.name}</p>
                    <p className="text-xs text-red-100 mt-0.5">
                      {role.isActive ? 'Active role' : 'Inactive'}
                    </p>
                  </div>
                  <Shield className="w-6 h-6 opacity-70 shrink-0" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 line-clamp-3">
                  {role.description || 'No description provided.'}
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                  <Users className="w-4 h-4" />
                  {roleCounts[role.id] ?? 0} employees assigned
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
