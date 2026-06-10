'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MapPin,
  Map,
  Building,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  Grid3X3,
  List,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Settings,
  X,
  Save,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { systemSetupService } from '@/lib/api'
import { toast } from 'react-hot-toast'
import AreaForm from '@/components/features/system-setup/AreaForm'


interface Area {
  id: string
  name: string
  districtId: string
  districtName?: string
  landmarkDescription: string
  directionNotes: string
  accessibilityLevel: 'EASY' | 'MODERATE' | 'DIFFICULT'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  isActive: boolean
}

interface District {
  id: string
  name: string
}

export default function AreasPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [areas, setAreas] = useState<Area[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('')
  const [selectedAccessibility, setSelectedAccessibility] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    districtId: '',
    landmarkDescription: '',
    directionNotes: '',
    accessibilityLevel: 'MODERATE' as 'EASY' | 'MODERATE' | 'DIFFICULT',
    riskLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    isActive: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [areasData, districtsData] = await Promise.all([
        systemSetupService.getAreas(),
        systemSetupService.getDistricts(),
      ])
      setAreas(areasData)
      setDistricts(districtsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load areas data')
    } finally {
      setLoading(false)
    }
  }

  const filteredAreas = areas.filter(area => {
    const matchesSearch = (area.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (area.landmarkDescription?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (area.directionNotes?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesDistrict = !selectedDistrict || area.districtId === selectedDistrict
    const matchesRiskLevel = !selectedRiskLevel || area.riskLevel === selectedRiskLevel
    const matchesAccessibility = !selectedAccessibility || area.accessibilityLevel === selectedAccessibility
    const matchesStatus = showInactive || area.isActive
    
    return matchesSearch && matchesDistrict && matchesRiskLevel && matchesAccessibility && matchesStatus
  })

  const handleCreate = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      districtId: '',
      landmarkDescription: '',
      directionNotes: '',
      accessibilityLevel: 'MODERATE',
      riskLevel: 'MEDIUM',
      isActive: true,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (item: Area) => {
    setEditingItem(item)
    // We don't need to manually set formData here anymore as AreaForm handles it via initialData
    setIsModalOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setLoading(true)
    try {
      if (editingItem) {
        await systemSetupService.updateArea(editingItem.id, data)
        toast.success('Area updated successfully')
      } else {
        await systemSetupService.createArea(data)
        toast.success('Area created successfully')
      }
      setIsModalOpen(false)
      loadData()
    } catch (error) {
      console.error('Failed to save area:', error)
      toast.error('Failed to save area')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this area?')) return
    try {
      await systemSetupService.deleteArea(id)
      toast.success('Area deleted successfully')
      loadData()
    } catch (error) {
      console.error('Failed to delete area:', error)
      toast.error('Failed to delete area')
    }
  }

  const handleToggleStatus = async (id: string) => {
    const area = areas.find(a => a.id === id)
    if (!area) return
    
    try {
      await systemSetupService.updateArea(id, { isActive: !area.isActive })
      toast.success(`Area ${area.isActive ? 'deactivated' : 'activated'} successfully`)
      loadData()
    } catch (error) {
      console.error('Failed to toggle status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredAreas.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredAreas.map(area => area.id))
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedItems.length === 0) return
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedItems.length} area(s)?`
      : `Are you sure you want to ${action} ${selectedItems.length} area(s)?`
    
    if (!confirm(confirmMessage)) return
    
    setLoading(true)
    try {
      if (action === 'delete') {
        await Promise.all(selectedItems.map(id => systemSetupService.deleteArea(id)))
      } else {
        await Promise.all(selectedItems.map(id => 
          systemSetupService.updateArea(id, { isActive: action === 'activate' })
        ))
      }
      toast.success(`Bulk ${action} successful`)
      setSelectedItems([])
      loadData()
    } catch (error) {
      console.error(`Failed to ${action} areas:`, error)
      toast.error(`Bulk ${action} failed`)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'District', 'Landmark Description', 'Direction Notes', 'Accessibility', 'Risk Level', 'Status']
    const csvContent = [
      headers.join(','),
      ...filteredAreas.map(area => [
        area.name,
        area.districtName || 'Unknown',
        `"${area.landmarkDescription.replace(/"/g, '""')}"`,
        `"${area.directionNotes.replace(/"/g, '""')}"`,
        area.accessibilityLevel,
        area.riskLevel,
        area.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'areas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getAccessibilityColor = (level: string) => {
    switch (level) {
      case 'EASY': return 'text-green-600 bg-green-50 border-green-200'
      case 'MODERATE': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'DIFFICULT': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const stats = {
    total: areas.length,
    active: areas.filter(a => a.isActive).length,
    inactive: areas.filter(a => !a.isActive).length,
    highRisk: areas.filter(a => a.riskLevel === 'HIGH').length,
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header section with glassmorphism */}
      <div className="relative mb-12 p-8 rounded-3xl bg-gradient-to-r from-red-600 to-red-800 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <MapPin className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Areas / Sub-Areas</h1>
          <p className="text-red-100/70 text-lg max-w-2xl font-light">
            Manage landmark-based location system for precise emergency dispatch without GPS dependency.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Areas</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
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
                <p className="text-sm font-medium text-slate-600">Inactive</p>
                <p className="text-2xl font-bold text-slate-400">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <EyeOff className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">High Risk</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highRisk}</p>
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
                Areas Management
              </CardTitle>
              <CardDescription className="font-medium text-slate-500 mt-1">
                Showing {filteredAreas.length} of {stats.total} areas
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search areas..." 
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
                Add Area
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
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Districts</option>
                {districts.map(district => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Risk Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <select
                value={selectedAccessibility}
                onChange={(e) => setSelectedAccessibility(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              >
                <option value="">All Accessibility</option>
                <option value="EASY">Easy</option>
                <option value="MODERATE">Moderate</option>
                <option value="DIFFICULT">Difficult</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                />
                <span className="text-sm font-medium text-slate-600">Show inactive</span>
              </label>
            </div>
          </div>

          {/* Actions Bar */}
          {selectedItems.length > 0 && (
            <div className="border-b border-slate-100 bg-red-50/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {selectedItems.length} area(s) selected
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
                    <EyeOff className="w-3 h-3 mr-1" />
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
                  onClick={() => setSelectedItems([])}
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
                        checked={selectedItems.length === filteredAreas.length && filteredAreas.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                      />
                    </th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Area Name</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">District</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Landmark</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Risk Level</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Accessibility</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAreas.map((area) => (
                    <tr key={area.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(area.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, area.id])
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== area.id))
                            }
                          }}
                          className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500/20"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{area.name}</div>
                        <div className="text-sm text-slate-500 truncate max-w-xs">{area.directionNotes}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building className="w-4 h-4 text-slate-400" />
                          {area.districtName || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 truncate max-w-xs">{area.landmarkDescription}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                          getRiskLevelColor(area.riskLevel)
                        )}>
                          {area.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                          getAccessibilityColor(area.accessibilityLevel)
                        )}>
                          {area.accessibilityLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(area.id)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                            area.isActive 
                              ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                              : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                          )}
                        >
                          {area.isActive ? <CheckCircle2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {area.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(area)}
                            className="h-8 w-8 rounded-lg hover:bg-white hover:text-red-600 hover:shadow-md border-transparent hover:border-slate-200 border"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(area.id)}
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
                {filteredAreas.map((area) => (
                  <Card key={area.id} className="border border-slate-200 hover:border-red-200 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 mb-1">{area.name}</h3>
                          <p className="text-sm text-slate-500">{area.districtName || 'Unknown District'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(area)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50"
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{area.landmarkDescription}</span>
                        </div>
                        
                        <div className="text-sm text-slate-500">{area.directionNotes}</div>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <span className={cn(
                            'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                            getRiskLevelColor(area.riskLevel)
                          )}>
                            {area.riskLevel}
                          </span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border',
                            getAccessibilityColor(area.accessibilityLevel)
                          )}>
                            {area.accessibilityLevel}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAreas.length === 0 && (
            <div className="p-20 text-center bg-slate-50/30">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {searchTerm || selectedDistrict || selectedRiskLevel || selectedAccessibility ? 'No matching areas found' : 'No areas found'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || selectedDistrict || selectedRiskLevel || selectedAccessibility 
                  ? 'Try adjusting your filters or search criteria' 
                  : 'Start by adding your first area to the system'}
              </p>
              {!searchTerm && !selectedDistrict && !selectedRiskLevel && !selectedAccessibility && (
                <Button onClick={handleCreate} className="rounded-xl bg-red-600 hover:bg-red-700 font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Area
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
              {filteredAreas.length} of {stats.total} areas
            </div>
          </div>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <AreaForm 
            initialData={editingItem || undefined}
            districts={districts}
            loading={loading}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </div>
  )
}
