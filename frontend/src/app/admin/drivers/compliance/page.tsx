'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Shield, Search, Filter, Eye, AlertTriangle, 
  CheckCircle2, XCircle, Calendar, FileText, 
  Loader2, Bell, RefreshCw, Activity, User, Clock, Pencil as Edit
} from 'lucide-react'
import { driversService } from '@/lib/api'
import { Employee } from '@/types'
import { format, differenceInDays } from 'date-fns'

export default function LicenseCompliancePage() {
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await driversService.getAll()
      setDrivers(data)
    } catch (err) {
      console.error('Failed to fetch compliance data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getComplianceStatus = (driver: Employee) => {
    if (!driver.licenseExpiryDate) return { label: 'NO LICENSE', color: 'text-gray-400 bg-gray-50 border-gray-100', icon: XCircle }
    
    const expiry = new Date(driver.licenseExpiryDate)
    const today = new Date()
    const daysLeft = differenceInDays(expiry, today)

    if (daysLeft < 0) return { label: 'EXPIRED', color: 'text-red-600 bg-red-50 border-red-100', icon: AlertTriangle }
    if (daysLeft < 30) return { label: 'EXPIRING SOON', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: Clock }
    if (driver.licenseStatus === 'SUSPENDED') return { label: 'SUSPENDED', color: 'text-red-600 bg-red-50 border-red-100', icon: Shield }
    
    return { label: 'VALID / COMPLIANT', color: 'text-green-600 bg-green-50 border-green-100', icon: CheckCircle2 }
  }

  const stats = useMemo(() => {
    const total = drivers.length
    const compliant = drivers.filter(d => getComplianceStatus(d).label === 'VALID / COMPLIANT').length
    const expiringSoon = drivers.filter(d => getComplianceStatus(d).label === 'EXPIRING SOON').length
    const expired = drivers.filter(d => getComplianceStatus(d).label === 'EXPIRED').length
    const fitnessPending = drivers.filter(d => d.medicalFitness === 'PENDING').length

    return { total, compliant, expiringSoon, expired, fitnessPending }
  }, [drivers])

  const filteredDrivers = drivers.filter(d => 
    `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">License & Compliance</h1>
          <p className="text-gray-500 mt-1 font-medium">Monitoring certification validity and medical fitness for the active driver fleet.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl font-bold h-11 bg-white shadow-sm border-gray-200 hover:border-red-500 hover:text-red-600 transition-all text-xs uppercase tracking-widest">
              <Bell className="w-4 h-4 mr-2" />
              Notify Expiring
            </Button>
            <Button variant="outline" className="rounded-xl font-bold h-11 bg-white shadow-sm border-gray-200 text-xs uppercase tracking-widest" onClick={fetchData}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {[
            { label: 'Fully Compliant', value: stats.compliant, color: 'green', icon: Shield, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600' },
            { label: 'Expiring < 30D', value: stats.expiringSoon, color: 'orange', icon: Clock, bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600' },
            { label: 'Expired Licenses', value: stats.expired, color: 'red', icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
            { label: 'Medical Pending', value: stats.fitnessPending, color: 'blue', icon: Activity, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2.5 whitespace-nowrap min-w-[200px]">
               <div className={`w-9 h-9 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center ${s.text}`}>
                  <s.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-lg font-black text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider">{s.label}</p>
               </div>
            </div>
          ))}
      </div>

      {/* Critical Alert Banner */}
      {stats.expired > 0 && (
         <div className="bg-red-50 border border-red-100/50 rounded-2xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black italic">!</div>
               <p className="text-sm font-bold text-red-700">Action Required: {stats.expired} drivers have expired licenses and cannot be dispatched.</p>
            </div>
            <button className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline">View All Expired</button>
         </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3">
          <div className="flex-1 relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors" />
             <input
                type="text"
                placeholder="Find driver by name, code or license number..."
                className="w-full pl-11 pr-6 h-10 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-red-500/5 focus:bg-white transition-all text-xs font-bold text-gray-700 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <Button variant="outline" className="h-10 rounded-xl px-4 text-xs font-bold bg-white border-gray-100 text-gray-500">
             <Filter className="w-3.5 h-3.5 mr-2" />
             All Statuses
          </Button>
      </div>

      {/* Compliance Table - Narrow Format */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-20 text-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Auditing Certifications...</p>
             </div>
          ) : filteredDrivers.length === 0 ? (
             <div className="p-20 text-center flex flex-col items-center opacity-30">
                <Shield className="w-16 h-16 mb-4" />
                <h3 className="font-black text-gray-900 uppercase">No Compliance Records Found</h3>
             </div>
          ) : (
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50/40 border-b border-gray-100">
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver / Employee Code</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">License Detail</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medical Fitness</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validity Bar</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Compliance Status</th>
                      <th className="py-3 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50">
                   {filteredDrivers.map(driver => {
                      const status = getComplianceStatus(driver)
                      const StatusIcon = status.icon
                      const daysLeft = driver.licenseExpiryDate ? differenceInDays(new Date(driver.licenseExpiryDate), new Date()) : 0
                      const progress = Math.max(0, Math.min(100, (daysLeft / 365) * 100))

                      return (
                        <tr key={driver.id} className="hover:bg-gray-50/50 transition-all border-l-4 border-l-transparent hover:border-l-blue-500 group">
                           <td className="py-2 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-[10px] overflow-hidden shadow-inner shrink-0">
                                    {driver.profilePhoto ? (
                                      <img 
                                        src={driver.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${driver.profilePhoto}` : driver.profilePhoto} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                      />
                                    ) : (
                                       `${driver.firstName?.[0]}${driver.lastName?.[0]}`
                                    )}
                                 </div>
                                 <div>
                                    <div className="font-black text-gray-900 text-[11px] uppercase tracking-tight">{driver.firstName} {driver.lastName}</div>
                                    <div className="text-[9px] font-bold text-gray-400 mt-0.5 tracking-widest">{driver.employeeCode || 'EMP-000'}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="py-2 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                 <div className="p-1 px-1.5 bg-gray-100 rounded text-[9px] font-black uppercase text-gray-600 whitespace-nowrap tracking-widest border border-gray-200/50">Class {driver.licenseClass || 'C'}</div>
                                 <span className="text-[11px] font-black text-gray-500">{driver.licenseNumber || '-------'}</span>
                              </div>
                           </td>
                           <td className="py-2 px-6 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-widest gap-1 ${
                                 driver.medicalFitness === 'FIT' ? 'text-green-600 bg-green-50 border-green-100' :
                                 driver.medicalFitness === 'UNFIT' ? 'text-red-600 bg-red-50 border-red-100' :
                                 'text-gray-400 bg-gray-50 border-gray-100'
                              }`}>
                                 <div className={`w-1 h-1 rounded-full ${driver.medicalFitness === 'FIT' ? 'bg-green-600' : 'bg-gray-400'}`} />
                                 {driver.medicalFitness || 'PENDING'}
                              </span>
                           </td>
                           <td className="py-2 px-6 min-w-[150px]">
                              <div className="flex flex-col gap-1.5">
                                 <div className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-gray-400">{driver.licenseExpiryDate ? format(new Date(driver.licenseExpiryDate), 'dd MMM yyyy') : 'No Date'}</span>
                                    <span className={daysLeft < 30 ? 'text-red-500' : 'text-green-600'}>{daysLeft}d left</span>
                                 </div>
                                 <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${daysLeft < 30 ? 'bg-red-500' : 'bg-green-600'}`} 
                                      style={{ width: `${progress}%` }} 
                                    />
                                 </div>
                              </div>
                           </td>
                           <td className="py-2 px-6 text-center whitespace-nowrap">
                              <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest gap-1.5 ${status.color}`}>
                                 <StatusIcon className="w-2.5 h-2.5" />
                                 {status.label}
                              </div>
                           </td>
                           <td className="py-2 px-6 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                                    <Edit className="w-3.5 h-3.5 text-gray-400" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100">
                                    <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
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
    </div>
  )
}

