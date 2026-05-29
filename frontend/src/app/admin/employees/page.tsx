'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Search, Filter, Plus, Edit, Trash2, User, Mail, Phone, Shield, Activity, Clock, AlertCircle, X, Loader2, Briefcase, Key, ClipboardList, Lock, RefreshCw, Download, Users, Building2, MapPin, Truck, Stethoscope, CheckCircle2, UserCog, Eye } from 'lucide-react'
import { employeesService, systemSetupService } from '@/lib/api'
import { Employee, Role, EmployeeRole, Department, Region } from '@/types'
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar'
import { EmployeeProfileModal } from '@/components/employees/EmployeeProfileModal'

const ON_DUTY_SHIFT_STATUSES = new Set(['ON_DUTY', 'AVAILABLE', 'ON_SHIFT', 'TRANSPORTING'])

function getRoleTheme(roleName?: string | null) {
  const name = roleName?.toUpperCase() || ''
  if (name.includes('DRIVER')) {
    return { gradient: 'from-orange-500 to-amber-500', chip: 'bg-orange-50 text-orange-700 border-orange-100', ring: 'ring-orange-100' }
  }
  if (name.includes('NURSE')) {
    return { gradient: 'from-rose-600 to-red-500', chip: 'bg-red-50 text-red-700 border-red-100', ring: 'ring-red-100' }
  }
  if (name.includes('DISPATCH')) {
    return { gradient: 'from-blue-500 to-indigo-500', chip: 'bg-blue-50 text-blue-700 border-blue-100', ring: 'ring-blue-100' }
  }
  if (name.includes('ADMIN')) {
    return { gradient: 'from-purple-500 to-violet-600', chip: 'bg-purple-50 text-purple-700 border-purple-100', ring: 'ring-purple-100' }
  }
  return { gradient: 'from-slate-500 to-slate-600', chip: 'bg-slate-50 text-slate-700 border-slate-100', ring: 'ring-slate-100' }
}

function formatShiftStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Master Data States
  const [availableRoles, setAvailableRoles] = useState<EmployeeRole[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([])
  const [availableRegions, setAvailableRegions] = useState<Region[]>([])

  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    employeeRoleId: '',
    role: 'EMPLOYEE' as Role,
    departmentId: '',
    status: 'ACTIVE'
  })

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (silent) setIsRefreshing(true)
      else setIsLoading(true)
      setFetchError(null)

      const [employeesData, rolesData, deptsData, regionsData] = await Promise.all([
        employeesService.getAll(),
        systemSetupService.getRoles(),
        systemSetupService.getDepartments(),
        systemSetupService.getRegions(),
      ])

      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      setAvailableRoles(Array.isArray(rolesData) ? rolesData : [])
      setAvailableDepartments(Array.isArray(deptsData) ? deptsData : [])
      setAvailableRegions(Array.isArray(regionsData) ? regionsData : [])
    } catch (err: any) {
      const status = err?.response?.status
      const raw =
        status === 429
          ? 'Too many requests — wait a few seconds, then click Refresh.'
          : err?.response?.data?.message ||
            err?.message ||
            'Failed to load employees. Check that the backend is running on port 3001.'
      const message = Array.isArray(raw) ? raw.join(', ') : raw
      setFetchError(message)
      if (!silent) setEmployees([])
    } finally {
      if (silent) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      setIsSubmitting(true)
      await employeesService.create(newEmployee)
      setIsAddModalOpen(false)
      setNewEmployee({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        employeeRoleId: '',
        role: 'EMPLOYEE' as Role,
        departmentId: '',
        status: 'ACTIVE'
      })
      loadAll({ silent: true })
    } catch (err: any) {
      console.error('Failed to add employee:', err)
      setError(
        err?.response?.data?.message || 
        err?.message || 
        'Failed to register personnel. Ensure that the username and email are unique.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-success/10 text-success'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-primary/10 text-primary'
      case 'on_leave': return 'bg-warning/10 text-warning'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800'
      case 'DISPATCHER': return 'bg-blue-100 text-blue-800'
      case 'DRIVER': return 'bg-orange-100 text-orange-800'
      case 'NURSE': return 'bg-teal-100 text-teal-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (roleName: string) => {
    const name = roleName?.toUpperCase() || ''
    if (name.includes('ADMIN')) return <Shield className="w-4 h-4" />
    if (name.includes('DISPATCH')) return <Activity className="w-4 h-4" />
    if (name.includes('DRIVER')) return <User className="w-4 h-4" />
    if (name.includes('NURSE')) return <AlertCircle className="w-4 h-4" />
    return <User className="w-4 h-4" />
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase()
      const deptName = employee.department?.name?.toLowerCase() || ''
      const roleName = employee.employeeRole?.name?.toLowerCase() || ''
      const code = employee.employeeCode?.toLowerCase() || ''
      const matchesSearch = searchTerm === '' || 
        fullName.includes(searchTerm.toLowerCase()) ||
        employee.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.phone?.includes(searchTerm) ||
        employee.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.includes(searchTerm.toLowerCase()) ||
        deptName.includes(searchTerm.toLowerCase()) ||
        roleName.includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === '' || employee.employeeRoleId === roleFilter
      const matchesStatus = statusFilter === '' || employee.status === statusFilter
      const matchesDepartment = departmentFilter === '' || employee.departmentId === departmentFilter
      const matchesRegion = regionFilter === '' || employee.station?.regionId === regionFilter
      
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesRegion
    })
  }, [employees, searchTerm, roleFilter, statusFilter, departmentFilter, regionFilter])

  const roleStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const employee of employees) {
      const label = employee.employeeRole?.name || 'Unassigned'
      counts[label] = (counts[label] || 0) + 1
    }
    return counts
  }, [employees])

  const stats = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'ACTIVE').length,
      onDuty: employees.filter(e => e.status === 'ACTIVE' && ON_DUTY_SHIFT_STATUSES.has(e.shiftStatus || '')).length,
      departments: new Set(employees.map(e => e.departmentId).filter(Boolean)).size
    }
  }, [employees])

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDetails(true)
  }

  const handleAssignRole = async (employeeId: string, employeeRoleId: string) => {
    if (!employeeRoleId) return
    try {
      await employeesService.update(employeeId, { employeeRoleId })
      toast.success('Role updated')
      await loadAll({ silent: true })
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee((prev) =>
          prev ? { ...prev, employeeRoleId, employeeRole: availableRoles.find((r) => r.id === employeeRoleId) || prev.employeeRole } : prev
        )
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
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee((prev) => (prev ? { ...prev, status: newStatus } : prev))
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee? This cannot be undone.')) return
    try {
      await employeesService.delete(employeeId)
      toast.success('Employee removed')
      setShowDetails(false)
      setSelectedEmployee(null)
      await loadAll({ silent: true })
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete employee'
      toast.error(Array.isArray(message) ? message.join(', ') : message)
    }
  }

  const handleExportReport = () => {
    const rows = filteredEmployees.map((e) => ({
      code: e.employeeCode || '',
      name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
      role: e.employeeRole?.name || '',
      department: e.department?.name || '',
      status: e.status,
      shift: e.shiftStatus || '',
      email: e.user?.email || '',
      phone: e.phone || '',
      station: e.station?.name || '',
    }))
    if (!rows.length) {
      toast.error('No employees to export')
      return
    }
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aamin-employees-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} employees`)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#C62828] via-[#D32F2F] to-[#E53935] text-white shadow-xl shadow-red-900/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_white,_transparent_55%)]" />
        <div className="relative p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-widest mb-3">
              <UserCog className="w-3.5 h-3.5" />
              Workforce & Organization
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">All Employees</h1>
            <p className="text-red-100 mt-2 max-w-xl">
              Unified registry for drivers, nurses, dispatchers, and admin staff across all departments and stations.
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
              onClick={handleExportReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Link href="/admin/employees/add">
              <Button variant="outline" className="rounded-xl font-bold h-11 px-5 bg-white/10 border-white/25 text-white hover:bg-white/20">
                Full Registration
              </Button>
            </Link>
            <Button
              className="bg-white text-red-700 hover:bg-red-50 rounded-xl shadow-lg font-black h-11 px-6"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Quick Add
            </Button>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Could not load workforce data</p>
              <p className="text-xs mt-1">{fetchError}</p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 border-amber-300" onClick={() => loadAll()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, tone: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, tone: 'text-green-600', bg: 'bg-green-50' },
          { label: 'On Duty', value: stats.onDuty, icon: Activity, tone: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Departments', value: stats.departments, icon: Building2, tone: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Drivers', value: roleStats['Driver'] || 0, icon: Truck, tone: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Nurses', value: roleStats['Nurse'] || 0, icon: Stethoscope, tone: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-red-50 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
              <item.icon className={`w-5 h-5 ${item.tone}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      {Object.keys(roleStats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleStats).map(([role, count]) => {
            const theme = getRoleTheme(role)
            return (
              <span key={role} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${theme.chip}`}>
                {role}
                <span className="opacity-70">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8 border border-red-50">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search name, code, role, department, email, phone…"
              className="w-full pl-12 pr-6 h-13 min-h-[52px] bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-100 focus:border-red-200 focus:bg-white transition-all font-medium text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-[52px] bg-slate-50 border border-slate-100 rounded-2xl px-5 font-bold text-slate-700 focus:ring-2 focus:ring-red-100 min-w-[160px]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <Button
              variant="outline"
              className={`rounded-2xl h-[52px] px-5 font-bold border-slate-100 ${showFilters ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
              <select
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Region</label>
              <select
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="">All Regions</option>
                {availableRegions.map((region) => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4 font-medium">
          Showing <span className="font-bold text-red-600">{filteredEmployees.length}</span> of {employees.length} employees
        </p>
      </div>

      {/* Employee grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-red-50">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading workforce…</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-red-100">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-red-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            {employees.length === 0 && !fetchError ? 'No employees yet' : 'No matches found'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {employees.length === 0 && !fetchError
              ? 'Register your first team member to start building your workforce.'
              : 'Try clearing filters or broadening your search.'}
          </p>
          {employees.length === 0 && !fetchError && (
            <Button className="bg-red-600 hover:bg-red-700 rounded-xl font-bold" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredEmployees.map((employee) => {
            const theme = getRoleTheme(employee.employeeRole?.name)
            const isActive = employee.status === 'ACTIVE'
            return (
              <div
                key={employee.id}
                className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group ${theme.ring} ring-1`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <EmployeeAvatar
                      profilePhoto={employee.profilePhoto}
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                      gradient={theme.gradient}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-lg leading-tight truncate">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-0.5 truncate">
                        {employee.employeeCode || 'No code'} · {employee.department?.name || 'General'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${theme.chip}`}>
                          {employee.employeeRole?.name || 'Unassigned'}
                        </span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{employee.user?.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium">{employee.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{employee.station?.name || 'No station assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium">{formatShiftStatus(employee.shiftStatus)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <Button
                      className="flex-1 rounded-xl h-10 font-bold text-xs bg-slate-900 hover:bg-slate-800"
                      onClick={() => handleViewDetails(employee)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl h-10 w-10 p-0 border-slate-200"
                      title={isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => handleUpdateStatus(employee.id, isActive ? 'INACTIVE' : 'ACTIVE')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl h-10 w-10 p-0 border-red-100 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Register Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#eef3f9] to-[#e4edf6] overflow-hidden animate-in fade-in duration-200">
          {/* Header */}
          <div className="relative h-[110px] bg-[#eef3f9] border-b border-[#d0e0f0] flex items-center px-8 shadow-sm flex-shrink-0">
             {/* Decorative Background Line */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%\' height=\'100%\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 50 L300 50 L310 40 L320 60 L330 10 L340 90 L350 50 L1000 50\' stroke=\'%231a5f9a\' stroke-width=\'2\' fill=\'none\'/%3E%3C/svg%3E")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
             
             {/* Large faint background cross */}
             <div className="absolute top-[-30px] right-[10%] opacity-5 pointer-events-none">
                <svg width="200" height="200" viewBox="0 0 100 100">
                  <path d="M 35 15 L 65 15 L 65 35 L 85 35 L 85 65 L 65 65 L 65 85 L 35 85 L 35 65 L 15 65 L 15 35 L 35 35 Z" fill="#1a5f9a" />
                </svg>
             </div>

             <div className="max-w-4xl mx-auto w-full flex items-center justify-between relative z-10">
               <div className="flex items-center gap-5">
                 {/* Ambulance Icon Mock */}
                 <div className="w-[72px] h-[48px] relative flex items-center justify-center text-[32px] bg-white rounded-md shadow-sm border border-gray-200" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.5)' }}>
                   🚑
                 </div>
                 <div>
                   <h2 className="text-[28px] font-bold text-[#1b5b9c] tracking-tight leading-none mb-1">Add New Employee</h2>
                   <p className="text-[#6c86a3] text-[13px]">Fill in the details below to add a new employee</p>
                 </div>
               </div>
               
               <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 border border-[#d0e0f0] text-gray-400 hover:text-red-500 hover:bg-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <form onSubmit={handleAddEmployee} className="max-w-4xl mx-auto space-y-5">
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm font-bold flex items-center gap-3 border border-red-200 shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* SECTION 1: EMPLOYEE INFORMATION */}
              <div className="bg-white rounded shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#e2e8f0] pt-12 pb-6 px-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 flex h-8 shadow-sm">
                  <div className="bg-[#df5c55] w-10 flex items-center justify-center text-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div className="bg-gradient-to-r from-[#69a1e3] to-[#8dbff7] text-white text-[11px] font-bold flex items-center px-4 pr-10 uppercase tracking-wider" style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', letterSpacing: '0.05em' }}>
                    Employee Information
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">First Name <span className="text-[#df5c55]">*</span></label>
                    <input required type="text" placeholder="Enter patient full name" className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" value={newEmployee.firstName} onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Last Name <span className="text-[#df5c55]">*</span></label>
                    <input required type="text" placeholder="Enter name" className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" value={newEmployee.lastName} onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Phone Number</label>
                    <div className="flex h-[38px] rounded-[4px] border border-[#cbd5e1] bg-[#f8fafc] overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 focus-within:bg-white focus-within:border-blue-400 transition-colors">
                      <div className="flex items-center px-3 bg-[#f1f5f9] border-r border-[#cbd5e1] text-[13px] text-[auto] font-medium min-w-[80px]">
                         <div className="w-4 h-3 bg-[#1d4ed8] mr-2 flex items-center justify-center rounded-[2px] overflow-hidden relative"><div className="absolute inset-0 bg-white/30 clip-path-half" style={{clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'}}/></div>
                         <span className="text-[#475569]">+252</span>
                      </div>
                      <input required type="tel" placeholder="Enter phone number" className="flex-1 px-3 bg-transparent text-[13px] text-[#334155] outline-none placeholder-[#94a3b8]" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Email Address <span className="text-[#df5c55]">*</span></label>
                    <input required type="email" placeholder="Enter employee email" className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* SECTION 2: JOB DETAILS */}
              <div className="bg-white rounded shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#e2e8f0] pt-12 pb-6 px-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 flex h-8 shadow-sm">
                  <div className="bg-[#df5c55] w-10 flex items-center justify-center text-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="bg-gradient-to-r from-[#69a1e3] to-[#8dbff7] text-white text-[11px] font-bold flex items-center px-4 pr-10 uppercase tracking-wider" style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', letterSpacing: '0.05em' }}>
                    Job Details
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Employee Role <span className="text-[#df5c55]">*</span></label>
                     <select required className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 outline-none" value={newEmployee.employeeRoleId} onChange={e => setNewEmployee({...newEmployee, employeeRoleId: e.target.value})}>
                      <option value="">Select role</option>
                      {availableRoles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Department <span className="text-[#df5c55]">*</span></label>
                    <select required className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 outline-none" value={newEmployee.departmentId} onChange={e => setNewEmployee({...newEmployee, departmentId: e.target.value})}>
                      <option value="">Select department</option>
                      {availableDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Employee Status <span className="text-[#df5c55]">*</span></label>
                     <select className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 outline-none" value={newEmployee.status} onChange={e => setNewEmployee({...newEmployee, status: e.target.value})}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">System Status (Role) <span className="text-[#df5c55]">*</span></label>
                     <select className="w-full h-[38px] px-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 outline-none" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value as Role})}>
                      <option value="EMPLOYEE">Standard Level</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ACCOUNT SETTINGS */}
              <div className="bg-white rounded shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#e2e8f0] pt-12 pb-6 px-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 flex h-8 shadow-sm">
                  <div className="bg-[#df5c55] w-10 flex items-center justify-center text-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="bg-gradient-to-r from-[#69a1e3] to-[#8dbff7] text-white text-[11px] font-bold flex items-center px-4 pr-10 uppercase tracking-wider" style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', letterSpacing: '0.05em' }}>
                    Account Settings
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c] flex items-center gap-2">
                      Username <span className="text-[#f59e0b]"><Lock className="w-3 h-3"/></span>
                    </label>
                    <div className="flex relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                        <User className="w-4 h-4" />
                      </div>
                      <input required type="text" placeholder="Select user account" className="w-full h-[38px] pl-10 pr-3 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                     <div className="relative flex items-center justify-center">
                       <input type="checkbox" id="sendEmail" defaultChecked className="w-[18px] h-[18px] peer cursor-pointer appearance-none border border-[#cbd5e1] rounded-[4px] bg-white checked:bg-[#3b82f6] checked:border-[#3b82f6] transition-colors" />
                       <svg className="absolute w-[12px] h-[12px] text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </div>
                     <label htmlFor="sendEmail" className="text-[13px] text-[#3b4b5c] cursor-pointer">Send Welcome Email</label>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PASSWORD */}
              <div className="bg-white rounded shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#e2e8f0] pt-12 pb-6 px-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 flex h-8 shadow-sm">
                  <div className="bg-[#df5c55] w-10 flex items-center justify-center text-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <Key className="w-4 h-4 transform -scale-x-100" />
                  </div>
                  <div className="bg-gradient-to-r from-[#69a1e3] to-[#8dbff7] text-white text-[11px] font-bold flex items-center px-4 pr-10 uppercase tracking-wider" style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)', letterSpacing: '0.05em' }}>
                    Password <span className="text-[11px] ml-1 font-black transform translate-y-[1px]">*</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Password <span className="text-[#df5c55]">*</span></label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                        <Key className="w-[14px] h-[14px] transform -scale-x-100" />
                      </div>
                      <input required type="password" placeholder="Enter password" className="w-full h-[38px] pl-9 pr-10 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] cursor-pointer hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#3b4b5c]">Confirm Password <span className="text-[#df5c55]">*</span></label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                        <Key className="w-[14px] h-[14px] transform -scale-x-100" />
                      </div>
                      <input required type="password" placeholder="Confirm password" className="w-full h-[38px] pl-9 pr-10 border border-[#cbd5e1] rounded-[4px] bg-[#f8fafc] text-[13px] text-[#334155] focus:ring-1 focus:ring-blue-400 focus:bg-white focus:border-blue-400 transition-colors outline-none placeholder-[#94a3b8]" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] cursor-pointer hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                   <div className="relative flex items-center justify-center mt-0.5">
                       <input type="checkbox" id="tempPass" defaultChecked className="w-[14px] h-[14px] peer cursor-pointer appearance-none border border-[#cbd5e1] rounded-[3px] bg-[#f1f5f9] checked:bg-[#94a3b8] checked:border-[#94a3b8] transition-colors" />
                       <svg className="absolute w-[10px] h-[10px] text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                   </div>
                   <label htmlFor="tempPass" className="text-[12px] text-[#94a3b8] cursor-pointer pt-[1px] leading-tight">A temporary password can be provided. User will be forced to change it on first login.</label>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-2 pb-10 text-center space-y-4">
                <div className="flex gap-4 justify-center">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gradient-to-b from-[#7a8da3] to-[#5a6e84] hover:from-[#6b7b8f] hover:to-[#4e6074] text-white px-8 py-3 rounded-[4px] text-[15px] shadow-[0_4px_10px_rgba(90,110,132,0.3)] transition-all flex items-center justify-center gap-2 w-[220px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    <X className="w-4 h-4 stroke-[3]" /> Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-gradient-to-b from-[#35c38e] to-[#259b6c] hover:from-[#2eb886] hover:to-[#1f8c60] text-white px-8 py-3 rounded-[4px] text-[15px] shadow-[0_4px_10px_rgba(37,155,108,0.3)] transition-all flex items-center justify-center gap-2 w-[260px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>Create Employee <span className="text-[22px] leading-[0] transform translate-y-[-1px] font-bold ml-1">›</span></>
                    )}
                  </button>
                </div>
                <p className="text-[12.5px] text-[#94a3b8] mt-4 font-medium">User login details and welcome information will be sent by email.</p>
              </div>
            </form>
          </div>
        </div>
      )}

      <EmployeeProfileModal
        employee={selectedEmployee}
        open={showDetails}
        onClose={() => setShowDetails(false)}
        availableRoles={availableRoles}
        onAssignRole={handleAssignRole}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDeleteEmployee}
      />
    </div>
  )
}
