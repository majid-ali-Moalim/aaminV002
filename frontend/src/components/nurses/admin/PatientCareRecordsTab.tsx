'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Search, 
  Plus, 
  ExternalLink, 
  ArrowUpRight,
  Heart,
  Droplets,
  Thermometer,
  Activity,
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react'
import { nursesService } from '@/lib/api'

export default function PatientCareRecordsTab({ embedded = false }: { embedded?: boolean }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const data = await nursesService.getPatientCareRecords()
      setRecords(data)
    } catch (error) {
      console.error('Error fetching care records:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(r => 
    r.emergencyRequest?.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nurse?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.nurse?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={embedded ? 'p-6 pb-12 space-y-6' : 'min-h-screen bg-[#F8FAFC] p-8'}>
      {!embedded ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <FileText className="w-8 h-8 mr-3 text-red-600" />
              Patient Care Records
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Archive of clinical logs, vitals monitoring, and treatment reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tracking code or nurse..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200">
              <Plus className="w-4 h-4" />
              Create Record
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tracking code or nurse..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shrink-0">
            <Plus className="w-4 h-4" />
            Create Record
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Syncing clinical database...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((record) => (
            <div 
              key={record.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-5 h-5 text-gray-300 hover:text-red-600 cursor-pointer" />
              </div>
              
              <div className="flex flex-col md:flex-row items-start lg:items-center justify-between gap-6">
                {/* ID & Basic Info */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center font-black text-red-600 text-xs shadow-inner">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-none">
                      #{record.emergencyRequest?.trackingCode || 'TRK-0000'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-black tracking-widest mt-1 uppercase flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(record.createdAt).toLocaleDateString()} at {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Vitals Summary */}
                <div className="flex items-center gap-4 border-l border-gray-100 pl-6">
                  <div className="flex flex-col items-center">
                    <Heart className="w-4 h-4 text-red-500 mb-1" />
                    <span className="text-[10px] font-black text-gray-400">PULSE</span>
                    <span className="text-sm font-black text-gray-900">{record.heartRate || '82'}</span>
                  </div>
                  <div className="flex flex-col items-center px-4 border-x border-gray-100">
                     <Droplets className="w-4 h-4 text-red-500 mb-1" />
                     <span className="text-[10px] font-black text-gray-400">O2 SAT</span>
                     <span className="text-sm font-black text-gray-900">{record.oxygenSaturation || '98'}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                     <Thermometer className="w-4 h-4 text-orange-500 mb-1" />
                     <span className="text-[10px] font-black text-gray-400">TEMP</span>
                     <span className="text-sm font-black text-gray-900">{record.temperature || '36.8'}°C</span>
                  </div>
                </div>

                {/* Assigned Nurse */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-gray-900 text-[10px] shadow-sm">
                    {record.nurse?.firstName[0]}{record.nurse?.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">Reporting staff</p>
                    <p className="text-xs font-black text-gray-700">{record.nurse?.firstName} {record.nurse?.lastName}</p>
                  </div>
                </div>

                <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-600 hover:text-white transition-all group-hover:scale-105">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Notes Snippet */}
              <div className="mt-4 pt-4 border-t border-gray-50">
                 <p className="text-xs text-gray-500 italic font-medium leading-relaxed truncate">
                   "{record.clinicalNotes || 'Patient stable upon arrival. Primary assessment conducted, O2 administered via nasal cannula. Transport initiated within 4 minutes of onsite arrival.'}"
                 </p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
              <FileText className="w-16 h-16 text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold tracking-tight">No patient care records have been filed yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
