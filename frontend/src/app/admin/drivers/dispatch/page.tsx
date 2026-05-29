'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Radio, Search, Filter, Eye, MapPin, Truck, 
  Activity, Clock, Loader2, CheckCircle2, 
  AlertTriangle, ArrowRight, User
} from 'lucide-react'
import { emergencyRequestsService, driversService } from '@/lib/api'
import { EmergencyRequest, Employee } from '@/types'
import { format } from 'date-fns'

export default function DispatchActivityPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [r, d] = await Promise.all([
        emergencyRequestsService.getAll(),
        driversService.getAll()
      ])
      setRequests(r)
      setDrivers(d)
    } catch (err) {
      console.error('Failed to fetch dispatch activity:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = requests.length
    const active = requests.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status)).length
    const completed = requests.filter(r => r.status === 'COMPLETED')
    const avgResponse = completed.length > 0 
      ? Math.round(completed.reduce((acc, r) => acc + (r.responseMinutes || 0), 0) / completed.length) 
      : 0
    const successRate = total > 0 ? Math.round((completed.length / total) * 100) : 0

    return { total, active, avgResponse, successRate }
  }, [requests])

  const filteredRequests = requests.filter(req => {
    const driverMatch = !selectedDriverId || req.driverId === selectedDriverId
    const searchMatch = !searchTerm || 
                        req.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        req.patient?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        req.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase())
    
    return driverMatch && searchMatch
  })

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-100'
      case 'CANCELLED': return 'text-red-600 bg-red-50 border-red-100'
      case 'PENDING': return 'text-orange-600 bg-orange-50 border-orange-100 animate-pulse'
      case 'TRANSPORTING': return 'text-blue-600 bg-blue-50 border-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
      default: return 'text-indigo-600 bg-indigo-50 border-indigo-100'
    }
  }

  const getStepProgress = (status: string) => {
    const steps = ['PENDING', 'ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED']
    const index = steps.indexOf(status)
    return index === -1 ? 0 : ((index + 1) / steps.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dispatch Activity</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Operational history and real-time monitoring of emergency missions.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                className="h-11 bg-white border border-gray-200 rounded-xl pl-9 pr-4 font-black text-[11px] uppercase tracking-wider text-gray-700 shadow-sm min-w-[220px] outline-none focus:ring-2 focus:ring-red-500/10 appearance-none"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
              >
                <option value="">All Active Drivers</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <Button variant="outline" className="rounded-xl font-black text-[11px] uppercase tracking-widest h-11 bg-white shadow-sm border-gray-200" onClick={fetchData}>
              <Radio className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse text-red-500' : ''}`} />
              Live Sync
            </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {[
            { label: 'Total Missions', value: stats.total, icon: Activity, color: 'gray', bg: 'bg-gray-50', text: 'text-gray-600' },
            { label: 'Active Missions', value: stats.active, icon: Radio, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600 animate-pulse' },
            { label: 'Avg. Response', value: `${stats.avgResponse}m`, icon: Clock, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
            { label: 'Success Rate', value: `${stats.successRate}%`, icon: CheckCircle2, color: 'green', bg: 'bg-green-50', text: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5 whitespace-nowrap min-w-[220px]">
               <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.text}`}>
                  <s.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase mt-1 tracking-widest">{s.label}</p>
               </div>
            </div>
          ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4">
          <div className="flex-1 relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors" />
             <input
                type="text"
                placeholder="Find missions by tracking code, patient name, or location..."
                className="w-full pl-11 pr-6 h-11 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-red-500/5 focus:bg-white transition-all text-xs font-bold text-gray-700 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="flex gap-2 shrink-0">
             {['ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => (
                <button 
                  key={s} 
                  className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-all border border-gray-100/50"
                  onClick={() => setSearchTerm(s === 'ACTIVE' ? '' : s)}
                >
                  {s}
                </button>
             ))}
          </div>
      </div>

      {/* Mission Log Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-20 text-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Compiling Mission Records...</p>
             </div>
          ) : filteredRequests.length === 0 ? (
             <div className="p-20 text-center flex flex-col items-center opacity-30">
                <div className="bg-gray-50 p-8 rounded-[2.5rem] mb-4">
                   <Truck className="w-16 h-16 text-gray-300" />
                </div>
                <h3 className="font-black text-gray-900 uppercase tracking-widest">No Activity Logged</h3>
             </div>
          ) : (
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50/40 border-b border-gray-100">
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mission Code / Time</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tactical Priority</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Route Progression</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Lead</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Live Status</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50">
                   {filteredRequests.map(req => {
                      const style = getStatusStyle(req.status)
                      const progress = getStepProgress(req.status)
                      
                      return (
                        <tr key={req.id} className="hover:bg-gray-50/50 transition-all group">
                           <td className="py-3 px-6 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black text-red-600 uppercase tracking-wider">{req.trackingCode}</span>
                                <div className="text-[10px] text-gray-400 mt-1 flex items-center font-bold">
                                   <Clock className="w-3 h-3 mr-1" />
                                   {format(new Date(req.createdAt), 'HH:mm • dd MMM')}
                                </div>
                              </div>
                           </td>
                           <td className="py-3 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                   req.priority === 'CRITICAL' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20 animate-pulse' :
                                   req.priority === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                                 }`}>
                                    <AlertTriangle className="w-4 h-4" />
                                 </div>
                                 <div className="flex flex-col">
                                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{req.patient?.fullName || 'Emergency Case'}</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{req.incidentCategory?.name || 'Standard Alert'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="py-3 px-6 min-w-[250px]">
                              <div className="flex items-center gap-3">
                                 <div className="flex flex-col items-center gap-0.5 shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white ring-1 ring-red-100 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                    <div className="w-0.5 h-4 bg-gray-200 rounded-full" />
                                    <div className={`w-2.5 h-2.5 rounded bg-blue-500 border-2 border-white ring-1 ring-blue-100 shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-opacity ${req.destination ? 'opacity-100' : 'opacity-20'}`} />
                                 </div>
                                 <div className="flex-1 space-y-1.5">
                                    <div className="flex flex-col gap-0.5">
                                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                          <span className="text-gray-900 truncate max-w-[150px]">{req.pickupLocation}</span>
                                          <span className="text-gray-400 font-bold">100%</span>
                                       </div>
                                       <div className="h-1 w-full bg-orange-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '100%' }} />
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                                          <span className="text-gray-400 truncate max-w-[150px]">{req.destination || 'Hospital Pending'}</span>
                                          <span className="text-gray-400 font-bold">{Math.round(progress)}%</span>
                                       </div>
                                       <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="py-3 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                 <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 shadow-inner overflow-hidden">
                                    {req.driver?.profilePhoto ? (
                                      <img 
                                        src={req.driver.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${req.driver.profilePhoto}` : req.driver.profilePhoto} 
                                        className="w-full h-full object-cover" 
                                      />
                                    ) : (
                                       `${req.driver?.firstName?.[0]}${req.driver?.lastName?.[0]}`
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight">{req.driver?.firstName} {req.driver?.lastName}</p>
                                    <div className="flex items-center text-[9px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">
                                       <Truck className="w-2.5 h-2.5 mr-1 text-indigo-400" />
                                       {req.ambulance?.ambulanceNumber || 'AMB-???'}
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="py-3 px-6 text-center whitespace-nowrap">
                              <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest gap-2 shadow-sm ${style}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${req.status === 'TRANSPORTING' ? 'bg-blue-600 animate-ping' : req.status === 'COMPLETED' ? 'bg-green-600' : 'bg-orange-500'}`} />
                                 {req.status.replace('_', ' ')}
                              </div>
                           </td>
                           <td className="py-3 px-6 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                                    <Eye className="w-4 h-4 text-gray-400" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                      )
                   })}
                </tbody>
             </table>
          )}
        </div>
      </div>

      {/* Real-time Connection Indicator */}
      <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-4">
         <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
         Live Operational Feed • Connected to Aamin Dispatch Center
      </div>
    </div>
  )
}
