'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  MapPin,
  Phone,
  Radio,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Briefcase,
  RefreshCw,
  Download,
  X,
  Mail,
  Shield,
  GraduationCap,
} from 'lucide-react'
import { dispatchersService, systemSetupService, employeesService } from '@/lib/api'
import { Employee, Station, Department, Region, EmployeeRole } from '@/types'
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar'
import { EmployeeProfileModal } from '@/components/employees/EmployeeProfileModal'
import DispatcherEditModal from '@/components/dispatchers/DispatcherEditModal'
import { DISPATCHER_QUALIFICATIONS } from '@/lib/dispatcherFormMasterData'

function formatShiftStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function getShiftColor(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'ON_DUTY':
      return 'bg-red-100 text-red-600 border-red-200'
    case 'ON_BREAK':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'UNAVAILABLE':
    case 'OFF_DUTY':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export default function DispatchersPage() {
  const router = useRouter()
  const [dispatchers, setDispatchers] = useState<Employee[]>([])
  const [stats, setStats] = useState<{ total?: number; active?: number; onDuty?: number; inactive?: number } | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [availableRoles, setAvailableRoles] = useState<EmployeeRole[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [qualificationFilter, setQualificationFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [selectedDispatcher, setSelectedDispatcher] = useState<Employee | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [editingDispatcher, setEditingDispatcher] = useState<Employee | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (silent) setIsRefreshing(true)
      else setIsLoading(true)
      setFetchError(null)

      const [list, statsData, stationsData, deptsData, regionsData, rolesData] = await Promise.all([
        dispatchersService.getAll(),
        dispatchersService.getStats(),
        systemSetupService.getStations(),
        systemSetupService.getDepartments(),
        systemSetupService.getRegions(),
        systemSetupService.getRoles(),
      ])

      setDispatchers(Array.isArray(list) ? list : [])
      setStats(statsData)
      setStations(Array.isArray(stationsData) ? stationsData.filter((s) => s.isActive !== false) : [])
      setDepartments(Array.isArray(deptsData) ? deptsData.filter((d) => d.isActive !== false) : [])
      setRegions(Array.isArray(regionsData) ? regionsData.filter((r) => r.isActive !== false) : [])
      setAvailableRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (err: any) {
      const message =
        err?.response?.status === 429
          ? 'Too many requests — wait a few seconds, then click Refresh.'
          : err?.response?.data?.message || err?.message || 'Failed to load dispatchers.'
      setFetchError(Array.isArray(message) ? message.join(', ') : message)
      if (!silent) setDispatchers([])
    } finally {
      if (silent) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredDispatchers = useMemo(() => {
    return dispatchers.filter((d) => {
      const fullName = `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase()
      const qual = ((d as any).qualification || '').toLowerCase()
      const email = d.user?.email?.toLowerCase() || ''
      const matchesSearch =
        !searchTerm ||
        fullName.includes(searchTerm.toLowerCase()) ||
        d.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm) ||
        email.includes(searchTerm.toLowerCase()) ||
        qual.includes(searchTerm.toLowerCase())

      const matchesStation = !stationFilter || d.stationId === stationFilter
      const matchesShift = !shiftFilter || d.shiftStatus === shiftFilter
      const matchesStatus = !statusFilter || d.status === statusFilter
      const matchesDepartment = !departmentFilter || d.departmentId === departmentFilter
      const matchesRegion = !regionFilter || (d as any).station?.regionId === regionFilter
      const matchesQualification =
        !qualificationFilter || (d as any).qualification === qualificationFilter

      return (
        matchesSearch &&
        matchesStation &&
        matchesShift &&
        matchesStatus &&
        matchesDepartment &&
        matchesRegion &&
        matchesQualification
      )
    })
  }, [
    dispatchers,
    searchTerm,
    stationFilter,
    shiftFilter,
    statusFilter,
    departmentFilter,
    regionFilter,
    qualificationFilter,
  ])

  const activeFilterCount = [statusFilter, departmentFilter, regionFilter, qualificationFilter].filter(Boolean).length

  const openProfile = async (dispatcher: Employee) => {
    setLoadingProfile(true)
    setShowProfile(true)
    try {
      const full = await employeesService.getById(dispatcher.id)
      setSelectedDispatcher(full)
    } catch {
      setSelectedDispatcher(dispatcher)
      toast.error('Could not load full profile — showing list data')
    } finally {
      setLoadingProfile(false)
    }
  }

  const openEdit = async (dispatcher: Employee) => {
    try {
      const full = await employeesService.getById(dispatcher.id)
      setEditingDispatcher(full)
    } catch {
      setEditingDispatcher(dispatcher)
    }
    setShowEdit(true)
    setShowProfile(false)
  }

  const handleAssignRole = async (employeeId: string, employeeRoleId: string) => {
    if (!employeeRoleId) return
    try {
      await employeesService.update(employeeId, { employeeRoleId })
      toast.success('Role updated')
      await loadAll({ silent: true })
      if (selectedDispatcher?.id === employeeId) {
        const full = await employeesService.getById(employeeId)
        setSelectedDispatcher(full)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update role')
    }
  }

  const handleUpdateStatus = async (employeeId: string, newStatus: string) => {
    try {
      await employeesService.update(employeeId, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      await loadAll({ silent: true })
      if (selectedDispatcher?.id === employeeId) {
        const full = await employeesService.getById(employeeId)
        setSelectedDispatcher(full)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Remove this dispatcher? This cannot be undone.')) return
    try {
      await employeesService.delete(employeeId)
      toast.success('Dispatcher removed')
      setShowProfile(false)
      setSelectedDispatcher(null)
      await loadAll({ silent: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete dispatcher')
    }
  }

  const handleExport = () => {
    const rows = filteredDispatchers.map((d) => ({
      code: d.employeeCode || '',
      name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
      status: d.status,
      shift: d.shiftStatus || '',
      station: (d as any).station?.name || '',
      department: (d as any).department?.name || '',
      qualification: (d as any).qualification || '',
      email: d.user?.email || '',
      phone: d.phone || '',
    }))
    if (!rows.length) {
      toast.error('No dispatchers to export')
      return
    }
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aamin-dispatchers-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} dispatchers`)
  }

  const clearAdvancedFilters = () => {
    setStatusFilter('')
    setDepartmentFilter('')
    setRegionFilter('')
    setQualificationFilter('')
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white shadow-xl shadow-red-900/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_white,_transparent_55%)]" />
        <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5" />
              Dispatch Center
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Dispatchers</h1>
            <p className="text-red-100 mt-2 max-w-xl">
              Manage command center personnel, view profiles, edit assignments, and track shift availability.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl font-bold h-11 px-5 bg-white/10 border-white/25 text-white hover:bg-white/20"
              onClick={() => loadAll({ silent: true })}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Button
              variant="outline"
              className="rounded-xl font-bold h-11 px-5 bg-white text-red-700 hover:bg-red-50 border-0"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              className="bg-white text-red-700 hover:bg-red-50 rounded-xl shadow-lg font-black h-11 px-6"
              onClick={() => router.push('/admin/dispatchers/add')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Dispatcher
            </Button>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm flex-1">{fetchError}</p>
          <Button variant="outline" className="shrink-0 border-amber-300" onClick={() => loadAll()}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Dispatchers', value: stats?.total || 0, icon: Users, tone: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Active', value: stats?.active || 0, icon: CheckCircle2, tone: 'text-green-600', bg: 'bg-green-50' },
          { label: 'On Duty / Available', value: stats?.onDuty || 0, icon: Activity, tone: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Inactive', value: stats?.inactive || 0, icon: AlertCircle, tone: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-red-200 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.tone}`} />
              </div>
              <span className="text-2xl font-black text-gray-900 leading-none">{stat.value}</span>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search name, code, email, phone, qualification…"
              className="w-full pl-12 pr-6 h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500/10 focus:bg-white transition-all font-medium text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              className="h-12 bg-gray-50 border-none rounded-2xl px-6 font-bold text-gray-700 focus:ring-2 focus:ring-red-500/10 min-w-[160px]"
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
            >
              <option value="">All Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="h-12 bg-gray-50 border-none rounded-2xl px-6 font-bold text-gray-700 focus:ring-2 focus:ring-red-500/10 min-w-[160px]"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
            >
              <option value="">All Shift Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_DUTY">On Duty</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
            <Button
              variant="outline"
              className={`h-12 rounded-2xl px-6 font-bold ${
                showFilters || activeFilterCount > 0
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-white border-gray-200'
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Advanced
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <FilterField label="Account Status">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </FilterField>
            <FilterField label="Department">
              <select
                className="filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Region">
              <select className="filter-select" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                <option value="">All Regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Qualification">
              <select
                className="filter-select"
                value={qualificationFilter}
                onChange={(e) => setQualificationFilter(e.target.value)}
              >
                <option value="">All Qualifications</option>
                {DISPATCHER_QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </FilterField>
            {activeFilterCount > 0 && (
              <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                <Button variant="ghost" className="text-slate-500 font-bold text-xs" onClick={clearAdvancedFilters}>
                  <X className="w-4 h-4 mr-1" /> Clear advanced filters
                </Button>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 font-bold mt-4 uppercase tracking-wide">
          Showing {filteredDispatchers.length} of {dispatchers.length} dispatchers
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Dispatch Staff…</p>
            </div>
          ) : filteredDispatchers.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Radio className="w-10 h-10 text-red-200" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">No Dispatchers Found</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {dispatchers.length === 0
                  ? 'Get started by registering your first dispatcher for the command center.'
                  : 'Try adjusting your filters to find dispatch personnel.'}
              </p>
              {dispatchers.length === 0 && (
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black"
                  onClick={() => router.push('/admin/dispatchers/add')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Dispatcher
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispatcher</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Station</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qualification</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift</th>
                  <th className="py-4 px-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDispatchers.map((dispatcher) => (
                  <tr
                    key={dispatcher.id}
                    className="hover:bg-red-50/30 transition-colors cursor-pointer group"
                    onClick={() => openProfile(dispatcher)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          profilePhoto={dispatcher.profilePhoto}
                          firstName={dispatcher.firstName}
                          lastName={dispatcher.lastName}
                          size="md"
                          gradient="from-red-600 to-red-500"
                          className="ring-2 ring-white shadow-md group-hover:ring-red-200 transition-all"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 leading-tight truncate">
                            {dispatcher.firstName} {dispatcher.lastName}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                            {dispatcher.employeeCode || 'DIS-000'}
                          </div>
                          <span
                            className={`inline-flex mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              dispatcher.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {dispatcher.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-xs font-bold text-gray-700">
                        <MapPin className="w-3 h-3 mr-1.5 text-red-500 shrink-0" />
                        <span className="truncate">{(dispatcher as any).station?.name || '—'}</span>
                      </div>
                      <div className="flex items-center text-[10px] text-gray-400 mt-1 font-medium">
                        <Briefcase className="w-3 h-3 mr-1 shrink-0" />
                        {(dispatcher as any).department?.name || 'Dispatch Operations'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-xs font-bold text-gray-700">
                        <GraduationCap className="w-3 h-3 mr-1.5 text-red-500 shrink-0" />
                        <span className="truncate">{(dispatcher as any).qualification || '—'}</span>
                      </div>
                      {dispatcher.licenseNumber && (
                        <div className="flex items-center text-[10px] text-gray-400 mt-1">
                          <Shield className="w-3 h-3 mr-1 shrink-0" />
                          {dispatcher.licenseNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-xs font-bold text-gray-700">
                        <Phone className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
                        {dispatcher.phone ? `+252 ${dispatcher.phone}` : '—'}
                      </div>
                      {dispatcher.user?.email && (
                        <div className="flex items-center text-[10px] text-gray-400 mt-1 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 mr-1 shrink-0" />
                          {dispatcher.user.email}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border ${getShiftColor(dispatcher.shiftStatus || '')}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatShiftStatus(dispatcher.shiftStatus)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View profile"
                          className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600"
                          onClick={() => openProfile(dispatcher)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit dispatcher"
                          className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-700"
                          onClick={() => openEdit(dispatcher)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {loadingProfile && showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      <EmployeeProfileModal
        employee={selectedDispatcher}
        open={showProfile && !loadingProfile}
        onClose={() => {
          setShowProfile(false)
          setSelectedDispatcher(null)
        }}
        availableRoles={availableRoles}
        profileVariant="dispatcher"
        onAssignRole={handleAssignRole}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
        onEdit={(emp) => {
          setShowProfile(false)
          openEdit(emp)
        }}
      />

      <DispatcherEditModal
        dispatcher={editingDispatcher}
        open={showEdit}
        stations={stations}
        departments={departments}
        onClose={() => {
          setShowEdit(false)
          setEditingDispatcher(null)
        }}
        onSaved={(updated) => {
          loadAll({ silent: true })
          if (selectedDispatcher?.id === updated.id) {
            employeesService.getById(updated.id).then(setSelectedDispatcher).catch(() => setSelectedDispatcher(updated))
          }
        }}
      />

      <style jsx global>{`
        .filter-select {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }
      `}</style>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  )
}
