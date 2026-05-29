'use client'

import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  Loader2,
  CalendarDays
} from 'lucide-react'
import { nursesService } from '@/lib/api'

export default function NurseShiftsPage() {
  const [nurses, setNurses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchNurses()
  }, [])

  const fetchNurses = async () => {
    try {
      setLoading(true)
      const data = await nursesService.getAll()
      setNurses(data)
    } catch (error) {
      console.error('Error fetching nurses for shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = nurses.filter(n => 
    `${n.firstName} ${n.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-600 border-green-200'
      case 'ON_DUTY': return 'bg-red-100 text-red-600 border-red-200'
      case 'ON_BREAK': return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      case 'OFF_DUTY': return 'bg-gray-100 text-gray-500 border-gray-200'
      default: return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <Clock className="w-8 h-8 mr-3 text-red-600" />
            Shift & Availability
          </h1>
          <p className="text-gray-500 font-medium mt-1">Real-time scheduling and medical staff availability monitoring</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search nurse name or code..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200">
            <CalendarDays className="w-4 h-4" />
            Duty Roster
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Fetching global availability...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-gray-50/50">
                 <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">Nurse Personnel</th>
                 <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">Current Status</th>
                 <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">Daily Schedule</th>
                 <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">Last Activity</th>
                 <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filtered.map((nurse) => (
                 <tr key={nurse.id} className="hover:bg-gray-50/50 transition-colors">
                   <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center font-black text-red-600 text-xs shadow-inner">
                           {nurse.firstName[0]}{nurse.lastName[0]}
                         </div>
                         <div>
                            <p className="font-bold text-gray-900 leading-none">{nurse.firstName} {nurse.lastName}</p>
                            <p className="text-[10px] text-gray-400 font-black tracking-widest mt-1 uppercase">{nurse.employeeCode}</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusColor(nurse.shiftStatus)}`}>
                        {nurse.shiftStatus === 'AVAILABLE' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {nurse.shiftStatus === 'ON_DUTY' && <Calendar className="w-3 h-3 mr-1" />}
                        {nurse.shiftStatus === 'OFF_DUTY' && <XCircle className="w-3 h-3 mr-1" />}
                        {nurse.shiftStatus}
                      </span>
                   </td>
                   <td className="px-6 py-5">
                      <div>
                        <p className="text-xs font-bold text-gray-600">
                          {nurse.typicalStartTime || '08:00'} - {nurse.typicalEndTime || '20:00'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{nurse.workDays || 'All weekdays'}</p>
                      </div>
                   </td>
                   <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-400">
                         <Clock className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-bold">2 hours ago (Auto-Update)</span>
                      </div>
                   </td>
                   <td className="px-6 py-5 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
          
          {filtered.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center">
               <AlertTriangle className="w-12 h-12 text-gray-100 mb-2" />
               <p className="text-gray-400 font-bold tracking-tight">No staff matching the criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
