'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Trash2, 
  Truck, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  MapPin,
  Globe,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest, EmergencyRequestStatus, Priority } from '@/types'
import { formatDistanceToNow } from 'date-fns'

// Shared Components
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import AssignModal from '@/components/features/emergency/AssignModal'
import StatusUpdateModal from '@/components/features/emergency/StatusUpdateModal'
import CancelModal from '@/components/features/emergency/CancelModal'
import CaseDetailModal from '@/components/features/emergency/CaseDetailModal'

export default function EmergencyRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [activeModal, setActiveModal] = useState<'assign' | 'status' | 'cancel' | null>(null)
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)
  const [detailPreview, setDetailPreview] = useState<EmergencyRequest | null>(null)

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      setRequests(data)
    } catch (err) {
      console.error('Failed to fetch requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(async () => {
      try {
        const data = await emergencyRequestsService.getAll()
        setRequests(data)
      } catch {
        /* backend may be restarting */
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: requests.length,
    active: requests.filter(r => !['COMPLETED', 'CANCELLED', 'FAILED'].includes(r.status)).length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    critical: requests.filter(r => r.priority === 'CRITICAL').length,
  }

  const filteredRequests = requests.filter(request => {
    const searchTarget = `${request.trackingCode} ${request.patient?.fullName || ''} ${request.patient?.phone || ''} ${request.pickupLocation}`.toLowerCase()
    const matchesSearch = searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' || request.status === statusFilter
    const matchesPriority = priorityFilter === '' || request.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const openModal = (request: EmergencyRequest, type: 'assign' | 'status' | 'cancel') => {
    setSelectedRequest(request)
    setActiveModal(type)
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      {/* Modern Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2.5 rounded-xl shadow-lg shadow-red-200">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Emergency Requests</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aamin Ambulance Dispatch Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            variant="ghost" 
            onClick={fetchRequests}
            className="text-slate-600 hover:bg-slate-100 h-11 px-4 font-bold text-sm rounded-xl"
           >
             <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
             Refresh
           </Button>
           <Link href="/ambulance-tracking" target="_blank" rel="noopener noreferrer">
             <Button
               variant="outline"
               className="h-11 px-5 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-xl flex items-center gap-2"
             >
               <Globe className="w-4 h-4 text-red-600" />
               Public Tracking
             </Button>
           </Link>
           <Button
            className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2"
            onClick={() => router.push('/admin/emergency-requests/new')}
           >
             <Plus className="w-5 h-5" />
             New Request
           </Button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* Simplified Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Cases', value: stats.total, color: 'blue' },
            { label: 'Active', value: stats.active, color: 'emerald' },
            { label: 'Pending', value: stats.pending, color: 'amber' },
            { label: 'Critical', value: stats.critical, color: 'red' },
          ].map((item) => (
            <div key={item.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-3xl font-black text-slate-900">{item.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                item.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                {item.label === 'Total Cases' && <Truck className="w-6 h-6" />}
                {item.label === 'Active' && <RefreshCw className="w-6 h-6" />}
                {item.label === 'Pending' && <Clock className="w-6 h-6" />}
                {item.label === 'Critical' && <AlertTriangle className="w-6 h-6" />}
              </div>
            </div>
          ))}
        </div>

        {/* Clean Filter Panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
           <div className="relative flex-1 min-w-[300px]">
             <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
             <input
               type="text"
               placeholder="Search tracking code, patient or location..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all"
             />
           </div>
           
           <select
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="h-12 px-6 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 cursor-pointer transition-all"
           >
             <option value="">All Statuses</option>
             {Object.keys(EmergencyRequestStatus).map(status => (
                <option key={status} value={status}>{status.replace('_', ' ').toLowerCase()}</option>
              ))}
           </select>
           
           <select
             value={priorityFilter}
             onChange={(e) => setPriorityFilter(e.target.value)}
             className="h-12 px-6 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 cursor-pointer transition-all"
           >
             <option value="">All Priorities</option>
             {Object.keys(Priority).map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
           </select>

           <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-slate-200 text-slate-500">
              <Filter className="w-5 h-5" />
           </Button>
        </div>

        {/* Clean Modern Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Case Details</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Current Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {isLoading && requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading incidents...</p>
                      </td>
                    </tr>
                   ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No matching cases found</td>
                    </tr>
                   ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">{request.trackingCode}</span>
                              <PriorityBadge priority={request.priority} size="sm" />
                            </div>
                            <p className="text-sm font-semibold text-slate-600">{request.patient?.fullName || 'Anonymous Patient'}</p>
                            <p className="text-xs text-slate-400 font-medium">{request.patient?.phone || 'No phone provided'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <StatusBadge status={request.status} />
                            {request.ambulance && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                                <Truck className="w-3 h-3" />
                                {request.ambulance.ambulanceNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 max-w-xs">
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2 text-slate-700 text-xs font-semibold leading-relaxed">
                              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{request.pickupLocation}</span>
                            </div>
                            {request.destination && (
                              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium pl-6">
                                <ArrowRight className="w-3 h-3" />
                                <span className="truncate">{request.destination}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                               <Clock className="w-4 h-4 text-slate-400" />
                               {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                             </div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(request.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            {request.status === 'PENDING' ? (
                              <button 
                                onClick={() => openModal(request, 'assign')}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95"
                                title="Assign Resources"
                              >
                                <Truck className="w-5 h-5" />
                              </button>
                            ) : !['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status) ? (
                              <button 
                                onClick={() => openModal(request, 'status')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition-all hover:shadow-md active:scale-95 flex items-center gap-2"
                                title="Update Status"
                              >
                                <span className="text-xs font-bold uppercase tracking-wider">Next</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            ) : null}

                            <button 
                              onClick={() => {
                                setDetailCaseId(request.id)
                                setDetailPreview(request)
                              }}
                              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                              title="View all case information"
                            >
                              <Eye className="w-5 h-5" />
                            </button>

                            {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status) && (
                              <button 
                                onClick={() => openModal(request, 'cancel')}
                                className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                title="Cancel Request"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                   )}
                </tbody>
             </table>
           </div>
        </div>
      </main>

      {/* Modals Integration */}
      {activeModal === 'assign' && selectedRequest && (
        <AssignModal 
          request={selectedRequest} 
          onClose={() => setActiveModal(null)} 
          onSuccess={fetchRequests} 
        />
      )}
      {activeModal === 'status' && selectedRequest && (
        <StatusUpdateModal 
          request={selectedRequest} 
          onClose={() => setActiveModal(null)} 
          onSuccess={fetchRequests} 
        />
      )}
      {activeModal === 'cancel' && selectedRequest && (
        <CancelModal 
          request={selectedRequest} 
          onClose={() => setActiveModal(null)} 
          onSuccess={fetchRequests} 
        />
      )}

      <CaseDetailModal
        caseId={detailCaseId}
        open={Boolean(detailCaseId)}
        preview={detailPreview}
        onClose={() => {
          setDetailCaseId(null)
          setDetailPreview(null)
        }}
      />
    </div>
  )
}
