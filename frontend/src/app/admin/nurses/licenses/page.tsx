'use client'

import React, { useState, useEffect } from 'react'
import { 
  Medal, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Calendar,
  FileBadge,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock
} from 'lucide-react'
import { nursesService } from '@/lib/api'

export default function NurseCertificationsPage() {
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
      console.error('Error fetching nurses for licenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = nurses.filter(n => 
    `${n.firstName} ${n.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isExpired = (date: string) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const getDaysRemaining = (date: string) => {
    if (!date) return 0
    const diff = new Date(date).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 3600 * 24))
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <Medal className="w-8 h-8 mr-3 text-red-600" />
            Medical Certifications
          </h1>
          <p className="text-gray-500 font-medium mt-1">Verification and lifecycle management of clinical practitioner credentials</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search nurse or license..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200">
            <FileBadge className="w-4 h-4" />
            Audit Sync
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Running credential audit...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map((nurse) => {
            const expired = isExpired(nurse.licenseExpiryDate)
            const daysLeft = getDaysRemaining(nurse.licenseExpiryDate)
            const warning = daysLeft > 0 && daysLeft < 30

            return (
              <div 
                key={nurse.id}
                className={`bg-white rounded-3xl p-6 shadow-sm border transition-all duration-300 relative group overflow-hidden ${
                  expired ? 'border-red-200 bg-red-50/10' : warning ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner ${
                      expired ? 'bg-red-100 text-red-600' : warning ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {nurse.firstName[0]}{nurse.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-none">
                        {nurse.firstName} {nurse.lastName}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-black tracking-widest mt-1 uppercase flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Badge: {nurse.employeeCode || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {expired ? (
                      <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full uppercase scale-90">Expired</div>
                    ) : (
                      <div className={`px-3 py-1 text-[10px] font-black rounded-full uppercase scale-90 ${
                        warning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                      }`}>
                         {warning ? 'Renewal Required' : 'Valid credential'}
                      </div>
                    )}
                  </div>
                </div>

                {/* License Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/40 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center text-gray-400 text-[10px] font-black uppercase mb-1">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      License Information
                    </div>
                    <p className="font-bold text-gray-900">{nurse.licenseNumber || 'PENDING-AUTH'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{nurse.qualification || 'Nurse Practitioner'}</p>
                  </div>
                  
                  <div className={`p-4 rounded-2xl border ${
                    expired ? 'bg-red-100/20 border-red-100' : warning ? 'bg-orange-100/20 border-orange-100' : 'bg-green-50/20 border-green-100'
                  }`}>
                    <div className="flex items-center text-gray-400 text-[10px] font-black uppercase mb-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      Expiry Status
                    </div>
                    <p className={`font-black tracking-tight ${expired ? 'text-red-700' : warning ? 'text-orange-700' : 'text-green-700'}`}>
                      {nurse.licenseExpiryDate ? new Date(nurse.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[10px] font-bold opacity-60">
                       {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
                    </p>
                  </div>
                </div>

                {/* Footer / Certificates */}
                <div className="mt-6 flex items-center justify-between pt-6 border-t border-dashed border-gray-100">
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-gray-400 uppercase">Documents:</span>
                     {nurse.certificationUpload ? (
                       <button className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all">
                         <Download className="w-3 h-3" />
                         Main_Cert.pdf
                       </button>
                     ) : (
                       <span className="text-[10px] font-bold text-gray-300 italic">No files uploaded</span>
                     )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-gray-400 uppercase">Clearance Status</span>
                       <div className="flex items-center gap-1">
                          {nurse.medicalClearanceStatus === 'APPROVED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : nurse.medicalClearanceStatus === 'PENDING' ? (
                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className="text-[10px] font-black text-gray-600 uppercase">{nurse.medicalClearanceStatus || 'N/A'}</span>
                       </div>
                    </div>
                  </div>
                </div>

                {expired && (
                  <div className="absolute inset-0 bg-red-600/5 backdrop-blur-[1px] pointer-events-none group-hover:opacity-0 transition-opacity" />
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
              <Medal className="w-16 h-16 text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold tracking-tight">No medical certifications found matching your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
