'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Users, Search, Filter, Plus, Eye, Edit, 
  MapPin, Phone, Activity, 
  CheckCircle2, AlertCircle, Loader2, Download,
  Stethoscope
} from 'lucide-react'
import { nursesService, systemSetupService } from '@/lib/api'
import { Employee, Station, Department, Region } from '@/types'
import { format } from 'date-fns'
import { getCrewOperationalStatusLabel, getCrewOperationalStatusStyles, getEmploymentStatusLabel } from '@/lib/staff/status'
import { cn } from '@/lib/utils'
import NurseEditModal from '@/components/nurses/NurseEditModal'

export default function NursesDashboard() {
  const router = useRouter()
  const [nurses, setNurses] = useState<Employee[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stations, setStations] = useState<Station[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [editingNurse, setEditingNurse] = useState<Employee | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [specializationFilter, setSpecializationFilter] = useState('')

  useEffect(() => {
    fetchData()
    fetchMasterData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [nursesData, statsData] = await Promise.all([
        nursesService.getAll(),
        nursesService.getStats()
      ])
      setNurses(Array.isArray(nursesData) ? nursesData : [])
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch nurses data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMasterData = async () => {
    try {
      const [stationsData, departmentsData, regionsData] = await Promise.all([
        systemSetupService.getStations(),
        systemSetupService.getDepartments(),
        systemSetupService.getRegions(),
      ])
      setStations(Array.isArray(stationsData) ? stationsData.filter((s) => s.isActive !== false) : [])
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
      setRegions(Array.isArray(regionsData) ? regionsData : [])
    } catch (err) {
      console.error('Failed to fetch master data:', err)
    }
  }

  const filteredNurses = useMemo(() => {
    return nurses.filter(nurse => {
      const nameMatch = `${nurse.firstName} ${nurse.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        nurse.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        nurse.phone?.includes(searchTerm) ||
                        (nurse as any).specialization?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const stationMatch = !stationFilter || nurse.stationId === stationFilter
      const statusMatch =
        !statusFilter ||
        (statusFilter === 'AVAILABLE'
          ? (nurse as Employee & { operationalStatus?: string }).operationalStatus === 'available'
          : (nurse as Employee & { operationalStatus?: string }).operationalStatus === 'unavailable')
      const specMatch = !specializationFilter || (nurse as any).specialization === specializationFilter

      return nameMatch && stationMatch && statusMatch && specMatch
    })
  }, [nurses, searchTerm, stationFilter, statusFilter, specializationFilter])

  const getAvailabilityColor = (status?: string) => getCrewOperationalStatusStyles(status).badge

  const getLicenseStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return 'text-green-600 bg-green-50 border-green-200'
      case 'EXPIRING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'EXPIRED': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getNurseRegionName = (nurse: Employee) => {
    const station = nurse.station ?? stations.find((s) => s.id === nurse.stationId)
    if (!station) return '—'
    return station.region?.name ?? regions.find((r) => r.id === station.regionId)?.name ?? '—'
  }

  type NurseRecord = Employee & {
    specialization?: string | null
    qualification?: string | null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Nurses</h1>
          <p className="text-gray-500 mt-1">Manage medical personnel, certifications, and clinical assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl font-bold h-11 px-5 shadow-sm bg-white border-red-100 text-red-600 hover:bg-red-50">
            <Download className="w-4 h-4 mr-2" />
            Certifications
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-900/20 font-black h-11 px-6"
            onClick={() => router.push('/admin/nurses/add')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Nurse
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Nurses', value: stats?.total || 0, icon: Users, iconClass: 'text-red-600', bgClass: 'bg-red-50' },
          { label: 'Available', value: stats?.available || 0, icon: CheckCircle2, iconClass: 'text-green-600', bgClass: 'bg-green-50' },
          { label: 'On Duty', value: stats?.onDuty || 0, icon: Activity, iconClass: 'text-orange-600', bgClass: 'bg-orange-50' },
          { label: 'ICU Specialists', value: nurses.filter(n => (n as any).specialization?.includes('ICU')).length, icon: Stethoscope, iconClass: 'text-purple-600', bgClass: 'bg-purple-50' },
          { label: 'Expiring License', value: stats?.expiringLicenses || 0, icon: AlertCircle, iconClass: 'text-cyan-600', bgClass: 'bg-cyan-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between hover:border-red-200 transition-colors cursor-default">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${stat.bgClass}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
              </div>
              <span className="text-2xl font-black text-gray-900 leading-none">{stat.value}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, code, phone, or specialization..."
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
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select 
              className="h-12 bg-gray-50 border-none rounded-2xl px-6 font-bold text-gray-700 focus:ring-2 focus:ring-red-500/10 min-w-[160px]"
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
            >
              <option value="">Specialization</option>
              <option value="Emergency">Emergency</option>
              <option value="ICU">ICU</option>
              <option value="Trauma">Trauma</option>
              <option value="General">General</option>
            </select>
            <Button variant="outline" className="h-12 rounded-2xl px-6 font-bold bg-white border-gray-200">
              <Filter className="w-4 h-4 mr-2" />
              Advanced
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Medical Staff...</p>
            </div>
          ) : filteredNurses.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-red-200" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">No Nurses Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">Try adjusting your filters or add a new nurse to the clinic.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Station & Region</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employment</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">License</th>
                  <th className="py-4 px-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNurses.map((nurse) => {
                  const record = nurse as NurseRecord
                  return (
                  <tr key={nurse.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center font-bold text-red-500 shadow-inner overflow-hidden shrink-0">
                          {nurse.profilePhoto ? (
                             <img 
                               src={nurse.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${nurse.profilePhoto}` : nurse.profilePhoto} 
                               alt="Avatar" 
                               className="w-full h-full object-cover" 
                             />
                          ) : (
                             `${nurse.firstName?.[0] || ''}${nurse.lastName?.[0] || ''}`
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{nurse.firstName} {nurse.lastName}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{nurse.employeeCode || 'NUR-000'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {nurse.employeeRole?.name || 'Nurse'}
                            {record.specialization ? ` · ${record.specialization}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" />
                          {nurse.phone || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{nurse.user?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1 text-red-500" />
                          {nurse.station?.name || stations.find((s) => s.id === nurse.stationId)?.name || 'Unassigned'}
                        </div>
                        <div className="text-xs text-gray-500">{getNurseRegionName(nurse)}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-gray-800">{getEmploymentStatusLabel(nurse.status)}</p>
                        <p className="text-xs text-gray-500">
                          Joined{' '}
                          {nurse.employmentDate
                            ? format(new Date(nurse.employmentDate), 'MMM yyyy')
                            : '—'}
                        </p>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border',
                          getAvailabilityColor((nurse as Employee & { operationalStatus?: string }).operationalStatus)
                        )}>
                          {getCrewOperationalStatusLabel((nurse as Employee & { operationalStatus?: string }).operationalStatus)}
                        </span>
                        {(nurse as Employee & { unavailableReason?: string }).unavailableReason ? (
                          <p className="text-[10px] text-gray-500">{(nurse as Employee & { unavailableReason?: string }).unavailableReason}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                          getLicenseStatusColor(nurse.licenseStatus || '')
                        )}>
                          {nurse.licenseStatus || 'UNKNOWN'}
                        </span>
                        <div className="text-xs text-gray-600">
                          {record.qualification || nurse.licenseType || '—'} · #{nurse.licenseNumber || '—'}
                        </div>
                        {nurse.licenseExpiryDate && (
                          <div className="text-xs text-gray-500">
                            Exp: {format(new Date(nurse.licenseExpiryDate), 'dd MMM yyyy')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm"
                          onClick={() => setEditingNurse(nurse)}
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NurseEditModal
        nurse={editingNurse}
        open={Boolean(editingNurse)}
        stations={stations}
        departments={departments}
        onClose={() => setEditingNurse(null)}
        onSaved={(updated) => {
          setNurses((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          setEditingNurse(null)
        }}
      />
    </div>
  )
}
