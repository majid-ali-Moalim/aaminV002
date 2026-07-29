'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Search, Filter, Calendar, Clock, CheckCircle2, XCircle, 
  AlertTriangle, User, Loader2, RefreshCw, Download, 
  MoreHorizontal, ChevronRight, PieChart as PieIcon,
  TrendingUp, ArrowUpRight, ArrowDownRight, History
} from 'lucide-react'
import { driversService } from '@/lib/api'
import { AttendanceRecord, Employee } from '@/types'
import { format, isSameDay, parseISO, differenceInMinutes } from 'date-fns'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip 
} from 'recharts'

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([])
  const [drivers, setDrivers] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const [attendanceData, driversData] = await Promise.all([
        driversService.getAttendance(today, today), // Initial load for today
        driversService.getAll()
      ])
      setLogs(attendanceData)
      setDrivers(driversData)
    } catch (err) {
      console.error('Failed to fetch attendance data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Stats Calculations
  const stats = useMemo(() => {
    const totalMinutes = logs.reduce((acc, log) => {
      if (log.checkIn && log.checkOut) {
        return acc + differenceInMinutes(new Date(log.checkOut), new Date(log.checkIn))
      }
      return acc
    }, 0)

    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60

    const earlyClockIns = logs.filter(log => {
      const driver = (log as any).employee as Employee
      if (driver?.typicalStartTime && log.checkIn) {
        const [h, m] = driver.typicalStartTime.split(':').map(Number)
        const scheduled = new Date(log.checkIn)
        scheduled.setHours(h, m, 0, 0)
        return new Date(log.checkIn) < scheduled
      }
      return false
    }).length

    const missingClockOuts = logs.filter(log => !log.checkOut).length
    
    // Simple absence logic: drivers who aren't in today's logs
    const presentDriverIds = new Set(logs.map(l => l.employeeId))
    const absences = drivers.length - presentDriverIds.size

    return {
      hoursWorked: `${hours}h ${mins}m`,
      earlyClockIns,
      missingClockOuts,
      absences
    }
  }, [logs, drivers])

  // Chart Data
  const chartData = [
    { name: 'Early', value: stats.earlyClockIns, color: '#10B981' },
    { name: 'Late', value: logs.filter(l => l.status === 'LATE').length, color: '#F59E0B' },
    { name: 'Unavailable', value: stats.absences, color: '#EF4444' },
  ]

  const weeklyData = [
    { day: 'Mon', early: 43, late: 12, absent: 5 },
    { day: 'Tue', early: 38, late: 15, absent: 8 },
    { day: 'Wed', early: 45, late: 10, absent: 4 },
    { day: 'Thu', early: 40, late: 18, absent: 6 },
    { day: 'Fri', early: 43, late: 14, absent: 8 },
  ]

  const getStatusStyle = (status: string, hasCheckOut: boolean) => {
    if (!hasCheckOut) return 'bg-red-100 text-red-600 border-red-200'
    switch (status) {
      case 'ON_TIME': return 'bg-green-100 text-green-600 border-green-200'
      case 'LATE': return 'bg-orange-100 text-orange-600 border-orange-200'
      case 'ABSENT': return 'bg-red-100 text-red-600 border-red-200'
      default: return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  const filteredLogs = logs.filter(log => {
      const emp = (log as any).employee
      const name = `${emp?.firstName} ${emp?.lastName}`.toLowerCase()
      return name.includes(searchTerm.toLowerCase()) || emp?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Driver Availability & Logs</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Track driver availability, shift starts, shift ends, and duty logs.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button className="h-12 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20 uppercase tracking-widest text-[10px]">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
          <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10">
            <option>All Drivers</option>
          </select>
          <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10">
            <option>All Stations</option>
          </select>
          <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10">
            <option>All Shifts</option>
          </select>
          <select className="h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10">
            <option>This Week</option>
          </select>
          
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text" 
              placeholder="Search driver name or ID..."
              className="w-full h-11 bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button variant="outline" className="h-11 rounded-xl border-gray-100 bg-white font-bold text-gray-500">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Content (3 cols) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Shift Hours Logged', value: stats.hoursWorked, icon: TrendingUp, color: 'green', bg: 'bg-green-50', text: 'text-green-600' },
                { label: 'Early Shift Starts', value: stats.earlyClockIns, icon: AlertTriangle, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
                { label: 'Open Shifts (No End)', value: stats.missingClockOuts, icon: History, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
                { label: 'Unavailable Today', value: stats.absences, icon: XCircle, color: 'red', bg: 'bg-red-50', text: 'text-red-600' },
              ].map((s, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.text}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900 leading-tight">{s.value}</p>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
          </div>

          {/* Tabs & Table */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-gray-50/50">
                 {['Availability Summary', 'Shift Start/End Logs', 'Late Shift Starts', 'Unavailable Logs'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase().replace(/ /g, '-'))}
                      className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        activeTab === tab.toLowerCase().replace(/ /g, '-')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab}
                    </button>
                 ))}
              </div>

              {/* Table Sub-header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white">
                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="text-gray-900">All Drivers</span>
                    <span>All Stations</span>
                    <span>All Shifts</span>
                    <span className="flex items-center gap-1">This Week <ChevronRight className="w-3 h-3 rotate-90" /></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-50 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-300" /></button>
                    <button className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-4 h-4 text-gray-300" /></button>
                    <button className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-4 h-4 text-gray-300" /></button>
                  </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30 border-b border-gray-100">
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Station</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Clock-In</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Clock-Out</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {isLoading ? (
                      <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500" /></td></tr>
                    ) : filteredLogs.map((log, idx) => {
                      const emp = (log as any).employee as Employee
                      const totalMins = log.checkOut ? differenceInMinutes(new Date(log.checkOut), new Date(log.checkIn)) : 0
                      const duration = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                {emp?.profilePhoto ? (
                                  <img src={emp.profilePhoto.startsWith('/uploads') ? `http://localhost:3001${emp.profilePhoto}` : emp.profilePhoto} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-black text-gray-400">{emp?.firstName?.[0]}{emp?.lastName?.[0]}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{emp?.firstName} {emp?.lastName}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{emp?.assignedAmbulance?.ambulanceNumber || 'AMB-000'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">{emp?.defaultShift || 'Morning'}</span>
                              <span className="text-[9px] text-gray-400 font-bold">Shift 7:00 AM - 3 PM</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-bold text-gray-600 text-xs">
                            {emp?.station?.name || 'Main Center'}
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-xs font-black text-gray-900">{format(new Date(log.checkIn), 'h:mm a')}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">{format(new Date(log.checkIn), 'h:mm a')}</p>
                          </td>
                          <td className="py-4 px-6">
                            {log.checkOut ? (
                              <>
                                <p className="text-xs font-black text-gray-900">{format(new Date(log.checkOut), 'h:mm a')}</p>
                                <p className="text-[9px] font-bold text-gray-400 mt-0.5">{format(new Date(log.checkOut), 'h:mm a')}</p>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-red-500">
                                <span className="text-xs font-black">Missing</span>
                                <History className="w-3 h-3" />
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 font-black text-gray-900 text-xs">
                            {log.checkOut ? duration : '---'}
                          </td>
                          <td className="py-4 px-6">
                             <div className="flex items-center justify-center gap-3">
                               <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(log.status, !!log.checkOut)}`}>
                                 {log.checkOut ? log.status.replace('_', ' ') : 'Missing Clock-Out'}
                               </span>
                               <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition-colors" />
                             </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-6 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase">Showing 1 to {filteredLogs.length} entries</span>
                <div className="flex gap-2">
                  <button className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-600/30">2</button>
                  {[3, 4, 5].map(n => <button key={n} className="h-8 w-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-400 font-black text-xs">{n}</button>)}
                  <button className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
          </div>
        </div>

        {/* Right Sidebar (1 col) */}
        <div className="space-y-6">
          
          {/* Unresolved Alerts */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Unresolved Alerts</h3>
                <MoreHorizontal className="w-4 h-4 text-gray-300" />
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Missing Clock-Outs</p>
             <div className="space-y-3">
                {logs.filter(l => !l.checkOut).slice(0, 3).map((log, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-orange-50/50 border border-orange-100/30">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-gray-900">{(log as any).employee?.firstName} {(log as any).employee?.lastName}</p>
                        <p className="text-[9px] font-black text-orange-600">{format(new Date(log.checkIn), 'h:mm a')}</p>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Main Center • 7:00 AM - 3 PM</p>
                    </div>
                  </div>
                ))}
                {logs.filter(l => !l.checkOut).length === 0 && (
                   <p className="text-center text-[10px] font-black text-gray-300 py-4 italic">No pending alerts</p>
                )}
             </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Daily Log Activities</h3>
             <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                   </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-black text-gray-900">{logs.length}</p>
                  <p className="text-[8px] font-black text-gray-400 uppercase">Records</p>
                </div>
             </div>
             <div className="space-y-3 mt-4">
                {chartData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-gray-500">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-900">{item.value}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Weekly Activity */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Weekly Activity</h3>
             <div className="space-y-5">
                {[
                  { label: 'Early Clock-Ins', value: 43, max: 50, color: 'bg-green-500' },
                  { label: 'Late Clock-Ins', value: 14, max: 50, color: 'bg-orange-500' },
                  { label: 'Absences', value: 8, max: 50, color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                       <p className="text-[10px] font-black text-gray-900">{item.value}</p>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                       <div className={`${item.color} h-full rounded-full`} style={{ width: `${(item.value/item.max)*100}%` }} />
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

      </div>
    </div>
  )
}

function ChevronLeft(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  )
}
