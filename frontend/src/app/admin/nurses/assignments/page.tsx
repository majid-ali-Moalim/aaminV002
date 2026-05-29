'use client'

import React, { useState, useEffect } from 'react'
import { 
  Shuffle, 
  MapPin, 
  Truck, 
  User, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Activity,
  Loader2
} from 'lucide-react'
import { nursesService } from '@/lib/api'

export default function NurseAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const data = await nursesService.getAssignments()
      setAssignments(data)
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = assignments.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assignedAmbulance?.ambulanceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <Shuffle className="w-8 h-8 mr-3 text-red-600" />
            Mission Assignments
          </h1>
          <p className="text-gray-500 font-medium mt-1">Real-time nurse to ambulance pairing and deployment</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search nurse or ambulance..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Synchronizing assignments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-500 group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-inner">
                    {item.profilePhoto ? (
                      <img src={item.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-red-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-none">
                      {item.firstName} {item.lastName}
                    </h3>
                    <div className="flex items-center mt-2">
                       <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                         item.shiftStatus === 'AVAILABLE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                       }`}>
                         {item.shiftStatus}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Ambulance Card */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">
                    <Truck className="w-3 h-3 mr-1.5" />
                    Assigned Unit
                  </div>
                  <p className="text-lg font-black text-gray-900">{item.assignedAmbulance?.ambulanceNumber || 'N/A'}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{item.assignedAmbulance?.vehicleModel || 'No vehicle linked'}</p>
                </div>

                {/* Station Card */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-wider mb-2">
                    <MapPin className="w-3 h-3 mr-1.5" />
                    Base Station
                  </div>
                  <p className="text-lg font-black text-gray-900 truncate">{item.station?.name || 'Main HQ'}</p>
                  <p className="text-[10px] text-gray-500 font-bold">Priority Status: High</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-6 border-t border-dashed border-gray-100">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-xs font-bold text-gray-400">Connection: Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] font-black text-red-600 uppercase">Paramedic Certified</span>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 bg-white rounded-3xl border border-dashed border-gray-300 flex flex-col items-center justify-center">
              <Activity className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">No active mission assignments found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
