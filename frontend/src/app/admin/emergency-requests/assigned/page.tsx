'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle2, 
  Truck, 
  User, 
  MapPin, 
  Clock, 
  RefreshCw,
  Search,
  ArrowRight,
  Shield,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'

// Shared Components
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import StatusUpdateModal from '@/components/features/emergency/StatusUpdateModal'

export default function AssignedRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      // Filter for ASSIGNED only
      setRequests(data.filter(r => r.status === 'ASSIGNED'))
    } catch (err) {
      console.error('Failed to fetch assigned requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(async () => {
      try {
        const data = await emergencyRequestsService.getAll()
        setRequests(data.filter(r => r.status === 'ASSIGNED'))
      } catch {
        /* backend may be restarting */
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: requests.length,
    active: requests.length,
    pending: 0,
    critical: requests.filter(r => r.priority === 'CRITICAL').length,
  }

  const filteredRequests = requests.filter(request => {
    const searchTarget = `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${request.ambulance?.ambulanceNumber || ''} ${request.driver?.firstName || ''}`.toLowerCase()
    return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const openUpdateModal = (request: EmergencyRequest) => {
    setSelectedRequest(request)
    setIsUpdateModalOpen(true)
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      <header className="bg-[#1D4ED8] text-white px-8 py-5 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2">
            <CheckCircle2 className="w-8 h-8 text-[#1D4ED8]" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Assigned Fleet</h1>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-[0.3em] leading-none">Resource Deployment Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={fetchRequests}
            className="bg-transparent border-white/20 text-white hover:bg-white/10 rounded-none h-12 uppercase font-black text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            SYNCH
          </Button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        <EmergencyStatsBar stats={stats} />

        <div className="bg-[#1E293B] p-4 shadow-lg flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="FILTER DEPLOYMENTS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-[#0F172A] border border-gray-700 text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-blue-500 rounded-none placeholder:text-gray-600 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {isLoading && requests.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Synching Fleet Data...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-gray-300">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">No assigned units at this time</p>
            </div>
          ) : filteredRequests.map((request) => (
            <div key={request.id} className="bg-white border-2 border-[#1E293B] shadow-2xl flex flex-col overflow-hidden hover:shadow-blue-900/10 transition-all duration-300">
              {/* Card Top bar */}
              <div className="bg-[#1E293B] p-4 text-white flex justify-between items-center border-b-4 border-blue-500">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned Call-Sign</span>
                  <span className="text-lg font-black">{request.trackingCode}</span>
                </div>
                <PriorityBadge priority={request.priority} size="sm" />
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {/* Visual Unit Assignment */}
                <div className="flex items-center gap-6 bg-blue-50 p-4 border border-blue-100 relative overflow-hidden">
                   <Truck className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-100" />
                   <div className="bg-blue-600 p-3 text-white border-2 border-blue-400">
                      <Truck className="w-6 h-6" />
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Deployed Asset</p>
                      <p className="text-xl font-black text-[#1E293B]">{request.ambulance?.ambulanceNumber || 'N/A'}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase flex items-center gap-1">
                         <User className="w-3 h-3" /> {request.driver?.firstName} {request.driver?.lastName}
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Incident Location</p>
                    <p className="text-[11px] font-black text-[#1E293B] uppercase line-clamp-2">{request.pickupLocation}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Intelligence</p>
                    <p className="text-[11px] font-black text-[#1E293B] uppercase truncate">{request.patient?.fullName || 'IDENT UNKNOWN'}</p>
                    <p className="text-[10px] font-black text-blue-500 font-mono mt-1">{request.patient?.phone || 'NO COMMS'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                   <Clock className="w-3.5 h-3.5 text-gray-400" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Assignment Age: {formatDistanceToNow(new Date(request.createdAt))}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <Button 
                  onClick={() => openUpdateModal(request)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-none border-b-4 border-emerald-900 active:translate-y-1 transition-all flex items-center justify-center gap-2 group"
                >
                  Advance Protocol
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isUpdateModalOpen && selectedRequest && (
        <StatusUpdateModal 
          request={selectedRequest} 
          onClose={() => setIsUpdateModalOpen(false)} 
          onSuccess={fetchRequests} 
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F1F5F9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94A3B8; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}
