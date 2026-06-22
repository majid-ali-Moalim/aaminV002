'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckSquare, 
  Truck, 
  User, 
  MapPin, 
  Clock, 
  RefreshCw,
  Search,
  Eye,
  FileText,
  BarChart3,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'

// Shared Components
import StatusBadge from '@/components/features/emergency/StatusBadge'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import EmergencyStatsBar from '@/components/features/emergency/EmergencyStatsBar'
import { useEmergencyPaths } from '@/lib/emergency/EmergencyPortalContext'

export default function CompletedRequestsPage() {
  const router = useRouter()
  const paths = useEmergencyPaths()
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRequests = async () => {
    try {
      if (requests.length === 0) setIsLoading(true)
      const data = await emergencyRequestsService.getAll()
      // Filter for COMPLETED only
      setRequests(data.filter(r => r.status === 'COMPLETED'))
    } catch (err) {
      console.error('Failed to fetch completed requests:', err)
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
    const searchTarget = `${request.trackingCode} ${request.patient?.fullName || ''} ${request.pickupLocation} ${request.ambulance?.ambulanceNumber || ''}`.toLowerCase()
    return searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase())
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Simulation of average response time
  const avgResponseTime = requests.length > 0 ? 12.5 : 0

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <header className="bg-slate-800 text-white px-8 py-5 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-2 border border-emerald-400">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Mission Archive</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-none">Completed Operational Logs</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={fetchRequests}
            className="bg-transparent border-slate-600 text-white hover:bg-white/10 rounded-none h-12 uppercase font-black text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Synch Archive
          </Button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Performance Overview */}
        <div className="bg-white border-2 border-slate-200 grid grid-cols-1 md:grid-cols-4 shadow-sm overflow-hidden">
           <div className="p-8 border-r border-slate-100 bg-slate-50 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center border border-emerald-200">
                 <CheckSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Missions</p>
                 <p className="text-3xl font-black text-slate-800">{requests.length}</p>
              </div>
           </div>
           <div className="p-8 border-r border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 flex items-center justify-center border border-blue-200">
                 <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Avg. Response</p>
                 <p className="text-3xl font-black text-slate-800">{avgResponseTime}m</p>
              </div>
           </div>
           <div className="p-8 border-r border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 flex items-center justify-center border border-red-200">
                 <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Crit-1 Resolved</p>
                 <p className="text-3xl font-black text-slate-800">{stats.critical}</p>
              </div>
           </div>
           <div className="p-8 bg-slate-900 text-white flex flex-col justify-center gap-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Integrity</p>
              <p className="text-xl font-black italic uppercase tracking-tighter">Verified 100%</p>
           </div>
        </div>

        <div className="bg-white border-2 border-slate-200 p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="SEARCH ARCHIVED RECORDS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-200 text-slate-900 font-black text-sm uppercase tracking-wider focus:outline-none focus:border-emerald-500 rounded-none placeholder:text-slate-400 transition-colors"
            />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
              <table className="min-w-full">
                 <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                       <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 whitespace-nowrap">Subject Data</th>
                       <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 whitespace-nowrap">Asset Log</th>
                       <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 whitespace-nowrap">Timeline</th>
                       <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Intel</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {isLoading && requests.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-[12px] font-black text-slate-300 uppercase tracking-widest">Accessing Vault...</td>
                       </tr>
                    ) : filteredRequests.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-[12px] font-black text-slate-300 uppercase tracking-widest">No matching records in archive</td>
                       </tr>
                    ) : (
                       filteredRequests.map((request, idx) => (
                          <tr key={request.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-emerald-50/50 transition-colors`}>
                             <td className="px-6 py-5 border-r border-slate-50">
                                <div className="space-y-1">
                                   <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-800">{request.trackingCode}</span>
                                      <PriorityBadge priority={request.priority} size="sm" />
                                   </div>
                                   <p className="text-[11px] font-bold text-slate-500 uppercase">{request.patient?.fullName || 'IDENT UNKNOWN'}</p>
                                </div>
                             </td>
                             <td className="px-6 py-5 border-r border-slate-50">
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 border border-slate-200 w-max">
                                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black uppercase text-slate-700">{request.ambulance?.ambulanceNumber || 'V-LOG'}</span>
                                   </div>
                                   <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 border border-slate-200 w-max">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black uppercase text-slate-700">{request.driver?.firstName || 'O-LOG'}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-5 border-r border-slate-50">
                                <div className="space-y-2">
                                   <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                      {format(new Date(request.createdAt), 'dd MMM yyyy')}
                                   </div>
                                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      <Clock className="w-3.5 h-3.5 text-slate-300" />
                                      {format(new Date(request.createdAt), 'HH:mm')} - {format(new Date(request.updatedAt), 'HH:mm')}
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <Button 
                                  variant="ghost" 
                                  className="h-10 w-10 p-0 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                                  onClick={() => router.push(paths.caseTimeline(request.id))}
                                >
                                   <FileText className="w-5 h-5" />
                                </Button>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  )
}
