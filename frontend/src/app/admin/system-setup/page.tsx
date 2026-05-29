'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  MapPin, 
  Map, 
  Building2, 
  UserCog, 
  Stethoscope, 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X,
  History,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Settings,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { systemSetupService, hospitalsService } from '@/lib/api'
import { 
  Region, 
  District, 
  Department, 
  EmployeeRole, 
  EquipmentLevel, 
  IncidentCategory,
  Station
} from '@/types'
import HospitalForm from '@/components/features/system-setup/HospitalForm'
import AreaForm from '@/components/features/system-setup/AreaForm'

type SetupTab = 'regions' | 'districts' | 'areas' | 'stations' | 'hospitals' | 'departments' | 'roles' | 'equipment' | 'categories'

export default function SystemSetupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as SetupTab) || 'regions'
  
  const [activeTab, setActiveTab] = useState<SetupTab>(initialTab)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Sync state if URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') as SetupTab
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Sync URL if state changes internally
  const handleTabChange = (tab: SetupTab) => {
    setActiveTab(tab)
    router.push(`/admin/system-setup?tab=${tab}`)
  }
  
  // Data states
  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<EmployeeRole[]>([])
  const [equipmentLevels, setEquipmentLevels] = useState<EquipmentLevel[]>([])
  const [categories, setCategories] = useState<IncidentCategory[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState<any>({ name: '', description: '', code: '', regionId: '', districtId: '' })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'regions': 
          setRegions(await systemSetupService.getRegions())
          break
        case 'districts': 
          setRegions(await systemSetupService.getRegions())
          setDistricts(await systemSetupService.getDistricts())
          break
        case 'departments': 
          setDepartments(await systemSetupService.getDepartments())
          break
        case 'roles': 
          setRoles(await systemSetupService.getRoles())
          break
        case 'equipment': 
          setEquipmentLevels(await systemSetupService.getEquipmentLevels())
          break
        case 'categories': 
          setCategories(await systemSetupService.getIncidentCategories())
          break
        case 'stations': 
          setRegions(await systemSetupService.getRegions())
          setDistricts(await systemSetupService.getDistricts())
          setStations(await systemSetupService.getStations())
          break
        case 'areas':
          setDistricts(await systemSetupService.getDistricts())
          setAreas(await systemSetupService.getAreas())
          break
        case 'hospitals':
          setRegions(await systemSetupService.getRegions())
          setDistricts(await systemSetupService.getDistricts())
          setHospitals(await hospitalsService.getAll())
          break
      }
    } catch (error) {
      console.error('Failed to load data', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item)
    if (item) {
      setFormData({ ...item })
    } else {
      setFormData({ name: '', description: '', code: '', regionId: '', districtId: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e?: React.FormEvent, data?: any) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const modelMap: Record<SetupTab, string> = {
        regions: 'region',
        districts: 'district',
        departments: 'department',
        roles: 'employeeRole',
        equipment: 'equipmentLevel',
        categories: 'incidentCategory',
        stations: 'station',
        areas: 'area',
        hospitals: 'hospital'
      }
      const submissionData = data || formData
      
      if (activeTab === 'hospitals') {
        if (editingItem) {
          await hospitalsService.update(editingItem.id, submissionData)
        } else {
          await hospitalsService.create(submissionData)
        }
      } else {
        const model = modelMap[activeTab]
        if (editingItem) {
          await systemSetupService.update(model, editingItem.id, submissionData)
        } else {
          await systemSetupService.create(model, submissionData)
        }
      }
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      console.error('Failed to save', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save the record. It may already exist.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      const modelMap: Record<SetupTab, string> = {
        regions: 'region',
        districts: 'district',
        departments: 'department',
        roles: 'employeeRole',
        equipment: 'equipmentLevel',
        categories: 'incidentCategory',
        stations: 'station'
      }
      if (activeTab === 'hospitals') {
        await hospitalsService.delete(id)
      } else {
        await systemSetupService.delete(modelMap[activeTab], id)
      }
      loadData()
    } catch (error) {
      console.error('Delete failed', error)
    }
  }

  const tabs = [
    { id: 'regions', label: 'Regions', icon: MapPin },
    { id: 'districts', label: 'Districts', icon: Map },
    { id: 'areas', label: 'Areas', icon: MapPin },
    { id: 'stations', label: 'Stations', icon: Warehouse },
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'roles', label: 'Employee Roles', icon: UserCog },
    { id: 'equipment', label: 'Equipment Levels', icon: Stethoscope },
    { id: 'categories', label: 'Incident Categories', icon: AlertTriangle },
  ]

  const activeTabData = () => {
    switch (activeTab) {
      case 'regions': return regions
      case 'districts': return districts
      case 'departments': return departments
      case 'roles': return roles
      case 'equipment': return equipmentLevels
      case 'categories': return categories
      case 'stations': return stations
      case 'areas': return areas
      case 'hospitals': return hospitals
      default: return []
    }
  }

  const filteredData = activeTabData().filter((item: any) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header section with glassmorphism */}
      <div className="relative mb-12 p-8 rounded-3xl bg-gradient-to-r from-secondary to-indigo-900 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <History className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">System Setup</h1>
          <p className="text-blue-100/70 text-lg max-w-2xl font-light">
            Manage your organization's master data, locations, and categorical configuration in one centralized dashboard.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange('regions')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Regions
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange('districts')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Districts
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange('areas')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all font-bold"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Advanced Areas
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange('stations')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all font-bold"
            >
              <Warehouse className="w-4 h-4 mr-2" />
              Advanced Stations
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleTabChange('hospitals')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all font-bold"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Manage Hospitals
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* Content Area */}
        <main className="w-full">
          <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500 mt-1">
                    Showing {filteredData.length} records in this category
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search..." 
                      className="pl-10 h-11 w-full md:w-64 rounded-xl border-slate-200 bg-white/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => handleOpenModal()}
                    className="h-11 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg transition-all gap-2 font-bold text-white whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && filteredData.length === 0 ? (
                <div className="p-20 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-slate-500 font-medium">Loading configuration data...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="p-20 text-center bg-slate-50/30">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-slate-400 font-light" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No records found</h3>
                  <p className="text-slate-500 mb-6">Start by adding your first {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}.</p>
                  <Button variant="outline" onClick={() => handleOpenModal()} className="rounded-xl border-slate-200 font-bold">
                    Create Entry
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Name & Details</th>
                        {activeTab === 'regions' && <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Code</th>}
                        {(activeTab === 'districts' || activeTab === 'stations' || activeTab === 'areas' || activeTab === 'hospitals') && <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Location Parent</th>}
                        <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map((item: any) => (
                        <tr key={item.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-800 mb-0.5">{item.name}</div>
                            {item.description && <div className="text-sm text-slate-500 font-medium truncate max-w-xs">{item.description}</div>}
                          </td>
                          {activeTab === 'regions' && (
                            <td className="px-8 py-5">
                              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-black uppercase">{item.code || '-'}</span>
                            </td>
                          )}
                          {(activeTab === 'districts' || activeTab === 'stations' || activeTab === 'areas' || activeTab === 'hospitals') && (
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold italic">
                                <div className="w-2 h-2 rounded-full bg-primary/30" />
                                {activeTab === 'districts' ? item.region?.name : 
                                 activeTab === 'areas' ? item.district?.name :
                                 activeTab === 'hospitals' ? `${item.region?.name} / ${item.district?.name}` :
                                 item.district?.name}
                              </div>
                            </td>
                          )}
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenModal(item)}
                                className="h-9 w-9 rounded-lg hover:bg-white hover:text-primary hover:shadow-md border-transparent hover:border-slate-200 border"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(item.id)}
                                className="h-9 w-9 rounded-lg hover:bg-destructive hover:text-white hover:shadow-md border-transparent hover:border-destructive border"
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
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modern Slide-up/Fade-in Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all sm:p-6 md:p-8 overflow-y-auto pt-10 pb-20">
          {activeTab === 'regions' ? (
            <div className="max-w-lg w-full text-left">
              <RegionForm 
                initialData={editingItem}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'districts' ? (
            <div className="max-w-lg w-full text-left">
              <DistrictForm 
                initialData={editingItem}
                regions={regions}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'stations' ? (
            <div className="max-w-lg w-full text-left">
              <StationForm 
                initialData={editingItem}
                regions={regions}
                districts={districts}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'departments' ? (
            <div className="max-w-lg w-full text-left">
              <DepartmentForm 
                initialData={editingItem}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'roles' ? (
            <div className="max-w-lg w-full text-left">
              <EmployeeRoleForm 
                initialData={editingItem}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'equipment' ? (
            <div className="max-w-lg w-full text-left">
              <EquipmentLevelForm 
                initialData={editingItem}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'categories' ? (
            <div className="max-w-lg w-full text-left">
              <IncidentCategoryForm 
                initialData={editingItem}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'areas' ? (
            <div className="max-w-lg w-full text-left">
              <AreaForm 
                initialData={editingItem}
                districts={districts}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : activeTab === 'hospitals' ? (
            <div className="max-w-lg w-full text-left">
              <HospitalForm 
                initialData={editingItem}
                regions={regions}
                districts={districts}
                loading={loading}
                onCancel={() => setIsModalOpen(false)}
                onSubmit={(data) => handleSubmit(undefined, data)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-dark p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Save className="w-20 h-20 text-white" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{editingItem ? 'Edit' : 'Create New'} {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}</h2>
                    <p className="text-white/70 font-medium">Fill in the details for this system entity.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Name / Title</label>
                  <Input 
                    required
                    placeholder="Enter name"
                    className="h-12 rounded-xl border-slate-200 font-bold focus:ring-primary/20"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Description (Optional)</label>
                  <textarea 
                    className="w-full h-24 p-4 rounded-xl border border-slate-200 font-medium text-slate-600 bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="Enter optional description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-12 rounded-2xl border-slate-200 font-bold text-slate-600 bg-white"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {editingItem ? 'Update Item' : 'Create Entry'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
