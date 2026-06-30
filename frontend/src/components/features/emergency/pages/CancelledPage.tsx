'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  XCircle, 
  Trash2, 
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  History,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyRequest } from '@/types'
import { formatDistanceToNow } from 'date-fns'

// Shared Components
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import { useEmergencyPaths, useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { fetchEmergencyRequests } from '@/lib/emergency/fetchEmergencyRequests'

export default function CancelledRequestsPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const portal = useEmergencyPortal()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRequests = async () => {
    try {
      if (requests.length === 0) setIsLoading(true)
      const data = await fetchEmergencyRequests(portal, portal === 'dispatcher' ? 'my-cases' : undefined)
      setRequests(Array.isArray(data) ? data.filter((r) => r.status === 'CANCELLED') : [])
    } catch (err) {
      console.error('Failed to fetch cancelled requests:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const stats = {
    total: requests.length,
    active: 0,
    pending: 0,
    critical: requests.filter(r => r.priority === 'CRITICAL').length,
  }

  const filteredRequests = requests.filter(request => {
    const searchTarget = `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation}`.toLowerCase()
    return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="bg-[#FEF2F2] min-h-screen">
      <header className="bg-red-900 text-white px-8 py-5 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2">
            <XCircle className="w-8 h-8 text-red-900" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Cancellation Log</h1>
            <p className="text-[10px] font-bold text-red-300 uppercase tracking-[0.3em] leading-none">Aborted Operation Matrix</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={fetchRequests}
            className="bg-transparent border-red-700 text-white hover:bg-white/10 rounded-none h-12 uppercase font-black text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            SYNCH LOGS
          </Button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        <EmergencyStatsBar stats={stats} />

        <div className="bg-red-950/10 p-4 border border-red-200 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
            <input
              type="text"
              placeholder="SEARCH ABORTED INCIDENTS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-white border border-red-100 text-red-900 font-black text-sm uppercase tracking-wider focus:outline-none focus:border-red-500 rounded-none placeholder:text-red-200 transition-colors shadow-inner"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {isLoading && requests.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                 <RefreshCw className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
                 <p className="text-xs font-black text-red-400 uppercase tracking-[0.3em]">Accessing Termination Data...</p>
              </div>
           ) : filteredRequests.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-red-200 bg-white">
                 <p className="text-xs font-black text-red-300 uppercase tracking-[0.3em]">Sector Incident Clean: No cancellations logged</p>
              </div>
           ) : (
              filteredRequests.map((request) => (
                 <div key={request.id} className="bg-white border-2 border-red-100 shadow-md flex flex-col group overflow-hidden">
                    <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                       <span className="text-sm font-black text-red-900 tracking-tighter">{request.trackingCode}</span>
                       <PriorityBadge priority={request.priority} size="sm" />
                    </div>
                    
                    <div className="p-6 flex-1 space-y-4">
                       <div className="flex items-start gap-4">
                          <div className="bg-red-100 p-3 text-red-600 border border-red-200">
                             <Trash2 className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">Termination Protocol</p>
                             <p className="text-sm font-black text-red-900 uppercase mt-2">{request.pickupLocation}</p>
                          </div>
                       </div>

                       <div className="py-4 border-y border-red-50">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cancellation Intel</p>
                          <div className="bg-red-50/50 p-3 border-l-4 border-red-500">
                             <p className="text-xs font-bold text-red-800 italic leading-relaxed uppercase">
                                "{request.notes || 'REASON NOT SPECIFIED IN LOG'}"
                             </p>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <History className="w-3.5 h-3.5" />
                          Logged {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                       </div>
                    </div>

                    <div className="p-4 bg-gray-50 flex gap-2 border-t border-gray-100">
                       <Button 
                         variant="outline" 
                         className="flex-1 rounded-none border-gray-200 text-[#1E293B] font-black uppercase text-[10px] tracking-widest h-10 hover:bg-white"
                         onClick={() => router.push(paths.caseTimeline(request.id))}
                       >
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          Intel
                       </Button>
                       <Button 
                         className="flex-1 rounded-none bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest h-10 border-b-2 border-red-900 active:translate-y-0.5"
                         onClick={() => router.push(paths.new)}
                       >
                          <RotateCcw className="w-3.5 h-3.5 mr-2" />
                          Reinstate
                       </Button>
                    </div>
                 </div>
              ))
           )}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fecaca; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ef4444; }
      `}</style>
    </div>
  )
}
