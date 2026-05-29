'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Users, Search, Filter, Plus, Eye, Edit, MoreHorizontal, 
  MapPin, Phone, Truck, Calendar, Activity, Shield, 
  CheckCircle2, AlertCircle, Clock, Loader2, Download,
  Grid3X3, List, Trash2, Settings, X, Save,
  AlertTriangle, Star, TrendingUp, TrendingDown
} from 'lucide-react'
import { driversService, systemSetupService, ambulancesService, employeesService, uploadService } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Driver {
  id: string
  firstName?: string
  lastName?: string
  phone?: string
  alternativePhone?: string
  email?: string
  nationalIdNumber?: string
  stationId?: string
  station?: { id: string; name: string }
  assignedAmbulanceId?: string
  assignedAmbulance?: { id: string; ambulanceNumber: string }
  shiftStatus?: 'AVAILABLE' | 'ON_DUTY' | 'ON_BREAK' | 'UNAVAILABLE'
  availabilityStatus?: string
  readinessStatus?: string
  drivingLicenseNumber?: string
  licenseStatus?: 'VALID' | 'EXPIRING' | 'EXPIRED'
  licenseExpiryDate?: string
  yearsOfExperience?: string
  employeeRoleId?: string
  employeeRole?: { id: string; name: string }
  departmentId?: string
  employmentType?: string
  joinDate?: string
  employmentStatus?: string
  profilePhoto?: string
  isActive?: boolean
  dateOfBirth?: string
  gender?: string
  residentialAddress?: string
  regionId?: string
  districtId?: string
  currentArea?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  assignAmbulanceNow?: boolean
  createAccount?: boolean
  username?: string
  password?: string
  mobileAppAccess?: boolean
  address?: string
  certifications?: string[]
  totalTrips?: number
  averageResponseTime?: number
  rating?: number
  lastActiveDate?: string
  createdAt?: string
  updatedAt?: string
}

interface Station {
  id: string
  name: string
}

interface Ambulance {
  id: string
  ambulanceNumber: string
}

export default function DriversPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stations, setStations] = useState<Station[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    // Personal Information (8 fields)
    profilePhoto: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    alternativePhone: '',
    email: '',
    nationalIdNumber: '',
    
    // Address & Location (4 fields)
    residentialAddress: '',
    regionId: '',
    districtId: '',
    currentArea: '',
    
    // Emergency Contact (3 fields)
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Employment Information (5 fields)
    employeeCode: '',
    departmentId: '',
    employmentType: '',
    joinDate: '',
    employmentStatus: '',
    
    // Dispatch & Operational Status (3 fields)
    shiftStatus: '',
    availabilityStatus: '',
    readinessStatus: '',
    
    // Driver Professional Details (3 fields)
    drivingLicenseNumber: '',
    licenseExpiryDate: '',
    yearsOfExperience: '',
    
    // Ambulance Assignment (2 fields)
    assignAmbulanceNow: false,
    assignedAmbulanceId: '',
    
    // Account Access (Optional)
    createAccount: false,
    username: '',
    password: '',
    mobileAppAccess: false,
    
    // Legacy fields for compatibility
    stationId: '',
    isActive: true,
  })

  useEffect(() => {
    fetchData()
    fetchMasterData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [driversData, statsData] = await Promise.all([
        driversService.getAll(),
        driversService.getStats()
      ])
      setDrivers(driversData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch drivers data:', err)
      toast.error('Failed to load drivers data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMasterData = async () => {
    try {
      const [stationsData, ambulancesData, rolesData, regionsData, districtsData] = await Promise.all([
        systemSetupService.getStations(),
        ambulancesService.getAll(),
        systemSetupService.getRoles(),
        systemSetupService.getRegions(),
        systemSetupService.getDistricts()
      ])
      setStations(stationsData)
      setAmbulances(ambulancesData)
    } catch (err) {
      console.error('Failed to fetch master data:', err)
      toast.error('Failed to load master data')
    }
  }

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const nameMatch = `${driver.firstName} ${driver.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSearch = searchTerm === '' || 
        nameMatch ||
        driver.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone?.includes(searchTerm) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const stationMatch = !stationFilter || driver.stationId === stationFilter
      const statusMatch = !statusFilter || driver.shiftStatus === statusFilter
      const licenseMatch = !licenseFilter || driver.licenseStatus === licenseFilter
      const ratingMatch = !ratingFilter || (driver.rating && driver.rating >= parseFloat(ratingFilter))

      return matchesSearch && stationMatch && statusMatch && licenseMatch && ratingMatch
    })
  }, [drivers, searchTerm, stationFilter, statusFilter, licenseFilter, ratingFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'text-green-600 bg-green-50 border-green-200'
      case 'ON_DUTY': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'ON_BREAK': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'UNAVAILABLE': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getLicenseStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return 'text-green-600 bg-green-50 border-green-200'
      case 'EXPIRING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'EXPIRED': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
        )}
      />
    ))
  }

  const handleCreate = () => {
    router.push('/admin/drivers/add')
  }

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      // Personal Information (8 fields)
      profilePhoto: driver.profilePhoto || '',
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      gender: driver.gender || '',
      dateOfBirth: driver.dateOfBirth || '',
      phone: driver.phone || '',
      alternativePhone: driver.alternativePhone || '',
      email: driver.email || '',
      nationalIdNumber: driver.nationalIdNumber || '',
      
      // Address & Location (4 fields)
      residentialAddress: driver.residentialAddress || '',
      regionId: driver.regionId || '',
      districtId: driver.districtId || '',
      currentArea: driver.currentArea || '',
      
      // Emergency Contact (3 fields)
      emergencyContactName: driver.emergencyContactName || '',
      emergencyContactPhone: driver.emergencyContactPhone || '',
      emergencyContactRelationship: driver.emergencyContactRelationship || '',
      
      // Employment Information (5 fields)
      employeeCode: driver.employeeCode || '',
      departmentId: driver.departmentId || '',
      employmentType: driver.employmentType || '',
      joinDate: driver.joinDate || '',
      employmentStatus: driver.employmentStatus || '',
      
      // Dispatch & Operational Status (3 fields)
      shiftStatus: driver.shiftStatus || '',
      availabilityStatus: driver.availabilityStatus || '',
      readinessStatus: driver.readinessStatus || '',
      
      // Driver Professional Details (3 fields)
      drivingLicenseNumber: driver.drivingLicenseNumber || '',
      licenseExpiryDate: driver.licenseExpiryDate || '',
      yearsOfExperience: driver.yearsOfExperience || '',
      
      // Ambulance Assignment (2 fields)
      assignAmbulanceNow: driver.assignAmbulanceNow || false,
      assignedAmbulanceId: driver.assignedAmbulanceId || '',
      
      // Account Access (Optional)
      createAccount: driver.createAccount || false,
      username: driver.username || '',
      password: driver.password || '',
      mobileAppAccess: driver.mobileAppAccess || false,
      
      // Legacy fields for compatibility
      stationId: driver.stationId || '',
      isActive: driver.isActive ?? true,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (editingDriver) {
        const updatePayload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender,
          phone: formData.phone,
          alternatePhone: formData.alternativePhone,
          address: formData.residentialAddress,
          nationalId: formData.nationalIdNumber,
          employeeCode: formData.employeeCode,
          departmentId: formData.departmentId,
          status: formData.employmentStatus,
          shiftStatus: formData.shiftStatus,
          licenseNumber: formData.drivingLicenseNumber,
        }
        await employeesService.update(editingDriver.id, updatePayload)
        toast.success('Driver updated successfully')
      } else {
        await employeesService.create(formData)
        toast.success('Driver created successfully')
      }
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Failed to save driver:', error)
      toast.error('Failed to save driver')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return
    try {
      await employeesService.delete(id)
      toast.success('Driver deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Failed to delete driver:', error)
      toast.error('Failed to delete driver')
    }
  }

  const handleToggleStatus = async (id: string) => {
    const driver = drivers.find(d => d.id === id)
    if (!driver) return
    
    try {
      await employeesService.update(id, { status: driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success(`Driver ${driver.status === 'ACTIVE' ? 'deactivated' : 'activated'} successfully`)
      fetchData()
    } catch (error) {
      console.error('Failed to toggle status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSelectAll = () => {
    if (selectedDrivers.length === filteredDrivers.length) {
      setSelectedDrivers([])
    } else {
      setSelectedDrivers(filteredDrivers.map(driver => driver.id))
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedDrivers.length === 0) return
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedDrivers.length} driver(s)?`
      : `Are you sure you want to ${action} ${selectedDrivers.length} driver(s)?`
    
    if (!confirm(confirmMessage)) return
    
    try {
      if (action === 'delete') {
        await Promise.all(selectedDrivers.map(id => employeesService.delete(id)))
      } else {
        await Promise.all(selectedDrivers.map(id => 
          employeesService.update(id, { status: action === 'activate' ? 'ACTIVE' : 'INACTIVE' })
        ))
      }
      toast.success(`Bulk ${action} successful`)
      setSelectedDrivers([])
      fetchData()
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      toast.error(`Bulk ${action} failed`)
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Code', 'Phone', 'Email', 'Station', 'Ambulance', 'Status', 'License', 'Rating', 'Total Trips']
    const csvContent = [
      headers.join(','),
      ...filteredDrivers.map(driver => [
        `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'N/A',
        driver.employeeCode || 'N/A',
        driver.phone || 'N/A',
        driver.email || 'N/A',
        driver.station?.name || 'Unassigned',
        driver.assignedAmbulance?.ambulanceNumber || 'N/A',
        driver.shiftStatus || 'UNKNOWN',
        driver.licenseStatus || 'UNKNOWN',
        driver.rating || 'N/A',
        driver.totalTrips || 0
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drivers.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Drivers exported successfully')
  }

  const toPublicImageUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/uploads')) return `http://localhost:3001${url}`
    return url
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingPhoto(true)
      const response: any = await uploadService.uploadFile(file)
      if (!response?.url) throw new Error('Upload did not return file URL')
      setFormData((prev) => ({ ...prev, profilePhoto: response.url }))
      toast.success('Profile photo uploaded successfully')
    } catch (error: any) {
      console.error('Profile upload failed:', error)
      toast.error(error?.response?.data?.message || 'Failed to upload profile photo')
    } finally {
      setIsUploadingPhoto(false)
      event.target.value = ''
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header section with glassmorphism */}
      <div className="relative mb-12 p-8 rounded-3xl bg-gradient-to-r from-red-600 to-red-800 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Drivers Management</h1>
          <p className="text-red-100/70 text-lg max-w-2xl font-light">
            Manage driver operations, assignments, certifications, and performance metrics in one centralized dashboard.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Drivers</p>
                <p className="text-2xl font-bold text-slate-800">{stats?.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats?.available || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">On Duty</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.onDuty || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">License Expiring</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.expiringLicenses || 0}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">
                Drivers Management
              </CardTitle>
              <CardDescription className="font-medium text-slate-500 mt-1">
                Showing {filteredDrivers.length} of {stats?.total || 0} drivers
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search drivers..." 
                  className="pl-10 h-10 w-64 rounded-xl border-slate-200 bg-white/50 focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreate}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg transition-all gap-2 font-bold text-white"
              >
                <Plus className="w-4 h-4" />
                Add Driver
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filters */}
          <div className="border-b border-slate-100 bg-slate-50/30 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Filters:</span>
              </div>
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Stations</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="ON_DUTY">On Duty</option>
                <option value="ON_BREAK">On Break</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Licenses</option>
                <option value="VALID">Valid</option>
                <option value="EXPIRING">Expiring</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Ratings</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="1">1+ Stars</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedDrivers.length > 0 && (
            <div className="border-b border-slate-100 bg-red-50/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {selectedDrivers.length} driver(s) selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                    className="h-8 px-3 rounded-lg border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('deactivate')}
                    className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('delete')}
                    className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDrivers([])}
                  className="h-8 px-3 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  Clear selection
                </Button>
              </div>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                      />
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Driver</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Assignment</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">License</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Performance</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDrivers.includes(driver.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDrivers([...selectedDrivers, driver.id])
                            } else {
                              setSelectedDrivers(selectedDrivers.filter(id => id !== driver.id))
                            }
                          }}
                          className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-inner overflow-hidden shrink-0">
                            {driver.profilePhoto ? (
                               <img 
                                 src={driver.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${driver.profilePhoto}` : driver.profilePhoto} 
                                 alt="Avatar" 
                                 className="w-full h-full object-cover" 
                               />
                            ) : (
                               `${driver.firstName?.[0] || ''}${driver.lastName?.[0] || ''}` || 'D'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 leading-tight">
                              {`${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'No name'}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">{driver.employeeCode || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {driver.phone || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">{driver.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="w-3 h-3 mr-1 text-red-500" />
                            {driver.station?.name || 'Unassigned'}
                          </div>
                          <div className="flex items-center text-xs text-slate-500">
                            <Truck className="w-3 h-3 mr-1" />
                            {driver.assignedAmbulance?.ambulanceNumber || 'No Ambulance'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border',
                          getStatusColor(driver.shiftStatus || '')
                        )}>
                          {driver.shiftStatus?.replace('_', ' ') || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={cn(
                            'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                            getLicenseStatusColor(driver.licenseStatus || '')
                          )}>
                            {driver.licenseStatus || 'UNKNOWN'}
                          </span>
                          {driver.licenseExpiryDate && (
                            <div className="text-xs text-slate-500">
                              Exp: {format(new Date(driver.licenseExpiryDate), 'MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            {getRatingStars(driver.rating || 0)}
                            <span className="ml-2 text-xs text-slate-500">({driver.rating || 0})</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {driver.totalTrips || 0} trips
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(driver)}
                            className="h-8 w-8 rounded-lg hover:bg-white hover:text-red-600 hover:shadow-md border-transparent hover:border-slate-200 border"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(driver.id)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 hover:shadow-md border-transparent hover:border-red-200 border"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrivers.map((driver) => (
                  <Card key={driver.id} className="border border-slate-200 hover:border-red-200 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-inner overflow-hidden">
                            {driver.profilePhoto ? (
                               <img 
                                 src={driver.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${driver.profilePhoto}` : driver.profilePhoto} 
                                 alt="Avatar" 
                                 className="w-full h-full object-cover" 
                               />
                            ) : (
                               `${driver.fullName?.[0] || 'D'}`
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{driver.fullName || 'No name'}</h3>
                            <p className="text-xs text-slate-500">{driver.employeeCode || 'N/A'}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(driver)}
                          className="h-8 w-8 rounded-lg hover:bg-red-50"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {driver.phone || 'N/A'}
                        </div>
                        
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-3 h-3 mr-1 text-red-500" />
                          {driver.station?.name || 'Unassigned'}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                            getStatusColor(driver.shiftStatus || '')
                          )}>
                            {driver.shiftStatus?.replace('_', ' ') || 'UNKNOWN'}
                          </span>
                          <div className="flex items-center">
                            {getRatingStars(driver.rating || 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredDrivers.length === 0 && (
            <div className="p-20 text-center bg-slate-50/30">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {searchTerm || stationFilter || statusFilter ? 'No matching drivers found' : 'No drivers found'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || stationFilter || statusFilter 
                  ? 'Try adjusting your filters or search criteria' 
                  : 'Start by adding your first driver to system'}
              </p>
              {!searchTerm && !stationFilter && !statusFilter && (
                <Button onClick={handleCreate} className="rounded-xl bg-red-600 hover:bg-red-700 font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Driver
                </Button>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-white"
              >
                {viewMode === 'table' ? <Grid3X3 className="w-3 h-3 mr-1" /> : <List className="w-3 h-3 mr-1" />}
                {viewMode === 'table' ? 'Grid View' : 'Table View'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-white"
              >
                <Download className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
            </div>
            <div className="text-sm text-slate-500">
              {filteredDrivers.length} of {stats?.total || 0} drivers
            </div>
          </div>
        </div>
      </Card>

      {/* Modal - Full Screen for New Driver Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
          <div className="min-h-screen p-8 max-w-7xl mx-auto">
          <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-100">
            <div className="relative bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/15 rounded-xl">
                    <Users className="w-5 h-5 text-red-100" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">
                      {editingDriver ? 'Edit Driver' : 'New Driver'}
                    </h2>
                    <p className="text-red-200/70 text-xs font-medium">
                      {editingDriver ? 'Update driver information' : 'Add a new driver to the system'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Personal Information (10 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Users className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Profile Photo
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-inner overflow-hidden border border-slate-200">
                          {isUploadingPhoto ? (
                            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                          ) : formData.profilePhoto ? (
                            <img src={toPublicImageUrl(formData.profilePhoto)} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            `${formData.firstName?.[0] || 'D'}`
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {formData.firstName || 'New'} {formData.lastName || 'Driver'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Upload a clear face photo (JPG, PNG, WEBP). Max size: 5MB.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium bg-white text-slate-800 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                        </button>
                        {formData.profilePhoto && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Photo attached
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Alternative Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Alternative phone"
                      value={formData.alternativePhone}
                      onChange={(e) => setFormData({ ...formData, alternativePhone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      National ID Number
                    </label>
                    <input
                      type="text"
                      placeholder="National ID"
                      value={formData.nationalIdNumber}
                      onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Address & Location (4 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Address & Location</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="Home address"
                      value={formData.residentialAddress}
                      onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Region
                    </label>
                    <select
                      value={formData.regionId}
                      onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Region</option>
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      District
                    </label>
                    <select
                      value={formData.districtId}
                      onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select District</option>
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Current Area
                    </label>
                    <input
                      type="text"
                      placeholder="Current area"
                      value={formData.currentArea}
                      onChange={(e) => setFormData({ ...formData, currentArea: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact (3 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Emergency Contact</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="Emergency contact name"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Emergency contact phone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Relationship
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Spouse, Parent, Sibling"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Information (5 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Employment Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employee Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., DRV-001"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest bg-slate-50 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Department
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Department</option>
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employment Type
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Type</option>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="VOLUNTEER">Volunteer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Join Date
                    </label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employment Status
                    </label>
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dispatch & Operational Status (3 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dispatch & Operational Status</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Shift Status
                    </label>
                    <select
                      value={formData.shiftStatus}
                      onChange={(e) => setFormData({ ...formData, shiftStatus: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Status</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_DUTY">On Duty</option>
                      <option value="ON_BREAK">On Break</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Availability Status
                    </label>
                    <select
                      value={formData.availabilityStatus}
                      onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Status</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="BUSY">Busy</option>
                      <option value="OFF_DUTY">Off Duty</option>
                      <option value="SICK">Sick Leave</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Readiness Status
                    </label>
                    <select
                      value={formData.readinessStatus}
                      onChange={(e) => setFormData({ ...formData, readinessStatus: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    >
                      <option value="">Select Status</option>
                      <option value="READY">Ready</option>
                      <option value="RESTING">Resting</option>
                      <option value="FATIGUED">Fatigued</option>
                      <option value="UNFIT">Unfit for Duty</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driver Professional Details (3 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Driver Professional Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      placeholder="Driver license number"
                      value={formData.drivingLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, drivingLicenseNumber: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      License Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      placeholder="Years of experience"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Ambulance Assignment (2 fields) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Truck className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ambulance Assignment</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Assign Ambulance Now
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, assignAmbulanceNow: !formData.assignAmbulanceNow })}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30',
                          formData.assignAmbulanceNow ? 'bg-red-500' : 'bg-slate-300'
                        )}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                          formData.assignAmbulanceNow ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </button>
                    </div>
                  </div>

                  {formData.assignAmbulanceNow && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Assigned Ambulance
                      </label>
                      <select
                        value={formData.assignedAmbulanceId}
                        onChange={(e) => setFormData({ ...formData, assignedAmbulanceId: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                      >
                        <option value="">Select Ambulance</option>
                        {ambulances.map(a => (
                          <option key={a.id} value={a.id}>{a.ambulanceNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Access (Optional) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Settings className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Account Access (Optional)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Create Account
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, createAccount: !formData.createAccount })}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30',
                          formData.createAccount ? 'bg-red-500' : 'bg-slate-300'
                        )}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                          formData.createAccount ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </button>
                    </div>
                  </div>

                  {formData.createAccount && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Username
                        </label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Password
                        </label>
                        <input
                          type="password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Mobile App Access
                          </label>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mobileAppAccess: !formData.mobileAppAccess })}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30',
                              formData.mobileAppAccess ? 'bg-red-500' : 'bg-slate-300'
                            )}
                          >
                            <span className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                              formData.mobileAppAccess ? 'translate-x-6' : 'translate-x-1'
                            )} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    formData.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  )}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Active Status</p>
                    <p className="text-xs text-slate-400">
                      {formData.isActive ? 'Visible in system' : 'Archived'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30',
                    formData.isActive ? 'bg-green-500' : 'bg-slate-300'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2',
                    isLoading
                      ? 'bg-red-400 cursor-not-allowed opacity-70'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25 active:scale-[0.98]'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingDriver ? (
                    <>
                      <Save className="w-4 h-4" />
                      Update Driver
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Driver
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
