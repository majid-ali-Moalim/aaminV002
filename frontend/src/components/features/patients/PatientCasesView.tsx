'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Search as SearchIcon, Eye, Phone, MapPin, Activity, Clock, FileText, AlertTriangle, Truck, User, X, Hash, ChevronRight } from 'lucide-react'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'ARRIVED_HOSPITAL']

export interface PatientCasesViewConfig {
  title: string
  subtitle: string
  heroBadge?: string
  activeOnly?: boolean
  hideStatusFilter?: boolean
}

export default function PatientCasesView({
  title,
  subtitle,
  heroBadge = 'Case Records',
  activeOnly = false,
  hideStatusFilter = false,
}: PatientCasesViewConfig) {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Details Modal
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(data)
    } catch (err) {
      console.error('Failed to fetch emergency requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (req: EmergencyRequest) => {
    setSelectedRequest(req)
    setShowDetails(true)
  }

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const pName = (req.patient?.fullName || '').toLowerCase()
      const cName = (req.callerName || '').toLowerCase()
      const phone = (req.callerPhone || req.patient?.phone || '').toLowerCase()
      const code = (req.trackingCode || '').toLowerCase()
      const condition = (req.patientCondition || '').toLowerCase()
      const symptoms = (req.symptoms || '').toLowerCase()
      const location = (req.pickupLocation || '').toLowerCase()
      const ambulance = (req.ambulance?.ambulanceNumber || '').toLowerCase()
      const dateStr = format(new Date(req.createdAt), 'yyyy-MM-dd').toLowerCase()

      const searchString = `${pName} ${cName} ${phone} ${code} ${condition} ${symptoms} ${location} ${ambulance} ${dateStr}`
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(t => t.trim() !== '')

      const searchMatch = searchTerms.length === 0 || searchTerms.every(term => searchString.includes(term))
      const priorityMatch = !priorityFilter || req.priority === priorityFilter
      const statusMatch = !statusFilter || req.status === statusFilter

      return searchMatch && priorityMatch && statusMatch
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [requests, searchTerm, priorityFilter, statusFilter, activeOnly])

  const historicalRecords = useMemo(() => {
    if (!selectedRequest) return []
    return requests.filter(r => 
      r.id !== selectedRequest.id && (
        (selectedRequest.patientId && r.patientId === selectedRequest.patientId) || 
        (selectedRequest.callerPhone && r.callerPhone === selectedRequest.callerPhone) ||
        (selectedRequest.patient?.phone && r.patient?.phone === selectedRequest.patient?.phone)
      )
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [selectedRequest, requests])

  const stats = useMemo(() => {
    const scoped = activeOnly
      ? requests.filter((r) => !CLOSED_STATUSES.includes(r.status))
      : requests
    const active = scoped.filter((r) => !CLOSED_STATUSES.includes(r.status)).length
    const total = scoped.length
    const critical = scoped.filter((r) => r.priority === 'CRITICAL').length
    const recent = scoped.filter((r) => {
      const diffTime = Math.abs(new Date().getTime() - new Date(r.createdAt).getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7
    }).length

    return { total, critical, recent, active }
  }, [requests, activeOnly])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FileText className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
            {heroBadge}
          </p>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-red-100/80 mt-2 max-w-xl text-sm">{subtitle}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{activeOnly ? 'Active Cases' : 'Total Logs'}</p>
              <p className="text-3xl font-black text-secondary mt-1 tracking-tighter">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Critical</p>
              <p className="text-3xl font-black text-destructive mt-1 tracking-tighter">{stats.critical}</p>
            </div>
            <div className="bg-destructive/10 p-4 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Active Cases</p>
              <p className="text-3xl font-black text-warning mt-1 tracking-tighter">{stats.active}</p>
            </div>
            <div className="bg-warning/10 p-4 rounded-2xl">
              <Activity className="w-8 h-8 text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">New (7 Days)</p>
              <p className="text-3xl font-black text-success mt-1 tracking-tighter">{stats.recent}</p>
            </div>
            <div className="bg-success/10 p-4 rounded-2xl">
              <Clock className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Advanced Search: Code, Name, Condition, Location, or Unit..."
              className="w-full pl-12 pr-6 h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-secondary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
             <select 
              className="h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 appearance-none min-w-[140px]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {!hideStatusFilter && (
            <select 
              className="h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold text-secondary focus:ring-2 focus:ring-primary/20 appearance-none min-w-[150px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="ARRIVED_SCENE">Arrived Scene</option>
              <option value="TRANSPORTING">Transporting</option>
              <option value="ARRIVED_HOSPITAL">At Hospital</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            )}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
               <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-primary animate-spin" />
              <p className="text-secondary/40 font-black uppercase tracking-widest text-xs">Loading Records...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-20 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-secondary mb-2">No Records Found</h3>
              <p className="text-secondary/50 max-w-md mx-auto">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tracking Info</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Health Context</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Data</th>
                  <th className="py-4 px-6 text-[10px] text-right font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map(req => {
                  const patientName = req.patient?.fullName || req.callerName || 'Unknown Patient'
                  const displayPhone = req.callerPhone || req.patient?.phone || 'No Phone'
                  
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6 align-top">
                        <div className="inline-block px-2 py-1 bg-blue-50 text-primary font-black text-xs rounded uppercase tracking-widest mb-1 shadow-sm">
                          #{req.trackingCode}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {format(new Date(req.createdAt), 'MMM dd, HH:mm')}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top max-w-[200px]">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                               {patientName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <div className="font-bold text-secondary">{patientName}</div>
                               <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                 <Phone className="w-3 h-3 mr-1" /> {displayPhone}
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="py-4 px-6 align-top max-w-[250px]">
                        <div className="flex items-start text-xs text-secondary/70 mb-2">
                           <Activity className="w-3.5 h-3.5 mr-1.5 text-red-400 mt-0.5 shrink-0" />
                           <span className="line-clamp-2">{req.patientCondition || 'Condition unverified'}</span>
                        </div>
                        <div className="flex items-start text-xs text-secondary/70">
                           <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-400 mt-0.5 shrink-0" />
                           <span className="truncate">{req.pickupLocation}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top">
                        <div className="mb-2">
                          <span className={`px-2 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-widest border ${
                            req.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' :
                            req.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            req.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-green-50 text-green-600 border-green-100'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <div>
                           <span className={`px-2 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-widest border ${
                              ['COMPLETED', 'ARRIVED_HOSPITAL'].includes(req.status) ? 'bg-gray-50 text-gray-600 border-gray-200' :
                              req.status === 'CANCELLED' ? 'bg-red-50/50 text-red-500 border-red-100' :
                              'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {req.status.replace('_', ' ')}
                            </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top text-right">
                         <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => handleViewDetails(req)}>
                           <Eye className="w-4 h-4 text-secondary/60" />
                         </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

       {/* Centered Modern Tech Profile Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
          <div 
             className="absolute inset-0 bg-[#0A1128]/70 backdrop-blur-md transition-opacity" 
             onClick={() => setShowDetails(false)} 
          />
          
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#F4F7FB] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/20">
            
            {/* Tech Hero Header */}
            <div className="relative bg-[#0A1128] px-6 pt-8 pb-10 text-center shrink-0 border-b border-white/10">
               {/* Background Tech glowing orb effect */}
               <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[50px]"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/40 rounded-full blur-[60px]"></div>
               </div>

               <button 
                  onClick={() => setShowDetails(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white backdrop-blur-md transition-all active:scale-95 z-20 border border-white/10"
               >
                 <X className="w-4 h-4" />
               </button>

               <div className="w-20 h-20 mx-auto bg-[#1A2235] border border-white/10 rounded-full flex items-center justify-center text-3xl text-primary font-black shadow-[0_0_30px_rgba(37,99,235,0.2)] mb-3 z-10 relative">
                  {(selectedRequest.patient?.fullName || selectedRequest.callerName || 'U').substring(0, 2).toUpperCase()}
                  <div className="absolute -bottom-1 -right-1 bg-success text-white w-6 h-6 rounded-full border-2 border-[#1A2235] flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                     <Activity className="w-3 h-3" />
                  </div>
               </div>
               
               <h2 className="text-2xl font-black text-white tracking-tight relative z-10">
                  {selectedRequest.patient?.fullName || selectedRequest.callerName || 'Unknown Patient'}
               </h2>
               
               <div className="flex items-center justify-center gap-3 mt-2 text-gray-300 font-bold relative z-10">
                  <span className="flex items-center text-xs shadow-sm bg-[#1A2235]/80 px-3 py-1 rounded-md border border-white/5 font-mono">
                     <Phone className="w-3 h-3 mr-1.5 opacity-50"/> 
                     {selectedRequest.callerPhone || selectedRequest.patient?.phone || 'No Contact'}
                  </span>
                  <span className="flex items-center text-xs shadow-sm bg-[#1A2235]/80 px-3 py-1 rounded-md border border-white/5 font-mono">
                     <Hash className="w-3 h-3 mr-1.5 opacity-50" /> 
                     {selectedRequest.trackingCode}
                  </span>
               </div>
            </div>

            {/* Scrollable Telemetry Body */}
            <div className="flex-1 overflow-y-auto p-6 relative z-10 space-y-4">
               
               {/* Telemetry Core Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Status Block */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center transform transition-transform hover:-translate-y-1">
                     <Activity className="w-5 h-5 text-blue-500 mx-auto mb-1.5 opacity-80" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">System Status</p>
                     <p className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border inline-block ${
                           ['COMPLETED', 'ARRIVED_HOSPITAL'].includes(selectedRequest.status) ? 'bg-gray-50 text-gray-600 border-gray-200' :
                           selectedRequest.status === 'CANCELLED' ? 'bg-red-50 text-red-500 border-red-100' :
                           'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>{selectedRequest.status.replace('_', ' ')}
                     </p>
                  </div>
                  
                  {/* Priority Block */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center transform transition-transform hover:-translate-y-1">
                     <AlertTriangle className={`w-5 h-5 mx-auto mb-1.5 opacity-80 ${selectedRequest.priority === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`} />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Priority Level</p>
                     <p className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border inline-block ${
                           selectedRequest.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-100' :
                           selectedRequest.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                           selectedRequest.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           'bg-green-50 text-green-600 border-green-100'
                        }`}>{selectedRequest.priority}
                     </p>
                  </div>

                  {/* Time Block */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center transform transition-transform hover:-translate-y-1">
                     <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1.5 opacity-80" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Log Placed</p>
                     <p className="text-xs font-bold text-secondary">
                        {format(new Date(selectedRequest.createdAt), 'MMM dd, HH:mm')}
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Condition Matrix */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                     <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center">
                        <div className="w-1.5 h-3 bg-primary rounded-full mr-2" /> Health Matrix
                     </h3>
                     <div className="space-y-3">
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 border-dashed">
                           <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Chief Condition</p>
                           <p className="text-xs font-bold text-secondary leading-relaxed">{selectedRequest.patientCondition || 'Evaluation Pending'}</p>
                        </div>
                        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 border-dashed">
                           <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Symptoms</p>
                           <p className="text-xs font-bold text-secondary leading-relaxed">{selectedRequest.symptoms || 'Data unavailable'}</p>
                        </div>
                     </div>
                  </div>

                  {/* Operational Logistics */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
                     <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center">
                        <div className="w-1.5 h-3 bg-primary rounded-full mr-2" /> Operational Logistics
                     </h3>
                     
                     <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                           <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pickup Location Vector</p>
                              <p className="text-xs font-bold text-secondary">{selectedRequest.pickupLocation}</p>
                           </div>
                        </div>

                        {selectedRequest.ambulance && (
                           <div className="flex items-center gap-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                              <Truck className="w-4 h-4 text-gray-500 shrink-0" />
                              <div>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Assigned Unit</p>
                                 <p className="text-xs font-bold text-secondary">{selectedRequest.ambulance.ambulanceNumber}</p>
                              </div>
                           </div>
                        )}

                        {selectedRequest.driver && (
                           <div className="flex items-center gap-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                              <User className="w-4 h-4 text-gray-500 shrink-0" />
                              <div>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Driver Contact</p>
                                 <p className="text-xs font-bold text-secondary">{selectedRequest.driver.firstName}</p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* System Data Records Loop */}
               <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center justify-between mb-4">
                     <div className="flex items-center">
                        <div className="w-1.5 h-3 bg-primary rounded-full mr-2" /> Data Array: Emergency Logs
                     </div>
                     <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-black">{historicalRecords.length} Matches</span>
                  </h3>
                  
                  {historicalRecords.length === 0 ? (
                     <div className="bg-gray-50/50 rounded-xl border border-gray-100 border-dashed p-6 text-center flex flex-col items-center justify-center">
                        <Activity className="w-6 h-6 text-gray-300 mb-2" />
                        <p className="text-xs font-bold text-gray-400">0 prior engagements found in operational matrix</p>
                     </div>
                  ) : (
                     <div className="grid gap-2">
                        {historicalRecords.map((hr, idx) => (
                           <div key={hr.id} className="group flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-primary/30 rounded-xl transition-all shadow-sm cursor-default">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] shadow-sm shrink-0">
                                    0{idx + 1}
                                 </div>
                                 <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[9px] font-black text-primary uppercase tracking-widest border border-blue-100 bg-blue-50/50 px-1.5 py-0.5 rounded">#{hr.trackingCode}</span>
                                       <span className="text-[10px] font-bold text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1"/>{formatDistanceToNow(new Date(hr.createdAt), { addSuffix: true })}</span>
                                    </div>
                                    <p className="text-xs font-bold text-secondary line-clamp-1">{hr.patientCondition || 'Condition unspecified'}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {hr.status.replace('_', ' ')}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
               
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
