'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart2, TrendingUp, Star, Award, 
  Activity, Clock, CheckCircle2, Shield,
  ArrowUpRight, ArrowDownRight, Loader2,
  Users, User, Heart, GraduationCap, Medal
} from 'lucide-react'
import { nursesService } from '@/lib/api'
import { Employee } from '@/types'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts'
import { Button } from '@/components/ui/button'

export default function NursePerformancePage() {
  const [nurses, setNurses] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const data = await nursesService.getAll()
        setNurses(data)
      } catch (err) {
        console.error('Failed to fetch performance data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Mocked performance data for the high-fidelity UI
  const performanceData = [
    { name: 'Mon', rating: 4.8, missions: 24 },
    { name: 'Tue', rating: 4.9, missions: 28 },
    { name: 'Wed', rating: 4.7, missions: 22 },
    { name: 'Thu', rating: 5.0, missions: 31 },
    { name: 'Fri', rating: 4.8, missions: 25 },
    { name: 'Sat', rating: 4.6, missions: 19 },
    { name: 'Sun', rating: 4.9, missions: 27 },
  ]

  const totalMissions = nurses.reduce((acc, n) => acc + (Math.floor(Math.random() * 50) + 10), 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Header */}
      <div className="bg-[#0A1128] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-red-600 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-20%] left-[-10%] w-72 h-72 bg-purple-600 blur-[100px] rounded-full" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="bg-red-600/20 p-2 rounded-xl text-red-400 border border-red-500/20">
                    <Award className="w-5 h-5" />
                 </div>
                 <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Clinical Excellence Unit</span>
              </div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Personnel Performance & Outcomes</h1>
              <p className="text-white/40 text-sm mt-3 font-medium max-w-2xl leading-relaxed">
                 Analytics-driven overview of medical staff efficiency, mission outcomes, and patient care ratings. Monitor the pulse of your clinical team.
              </p>
           </div>
           
           <div className="flex gap-4">
              <Button className="h-14 rounded-2xl px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest backdrop-blur-md">
                 Generate Report
              </Button>
           </div>
        </div>
      </div>

      {isLoading ? (
         <div className="p-24 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Aggregating Clinical Metrics...</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column: Macro Metrics */}
            <div className="xl:col-span-2 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                     { label: 'Overall Rating', value: '4.85', change: '+2.4%', icon: Star, color: 'text-amber-400' },
                     { label: 'Total Missions', value: totalMissions, change: '+12%', icon: Activity, color: 'text-red-400' },
                     { label: 'Care Awards', value: '14', change: '+2', icon: Medal, color: 'text-purple-400' }
                  ].map((stat, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                           <div className={`p-4 rounded-2xl bg-gray-50 group-hover:bg-red-50 group-hover:scale-110 transition-all ${stat.color}`}>
                              <stat.icon className="w-6 h-6" />
                           </div>
                           <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
                              <ArrowUpRight className="w-3 h-3" /> {stat.change}
                           </div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-4xl font-black text-secondary mt-1">{stat.value}</h3>
                     </div>
                  ))}
               </div>

               {/* Mission Volume Chart */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-lg font-black text-secondary tracking-tight">Mission Intensity Matrix</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Weekly volume distribution</p>
                     </div>
                     <div className="flex gap-2">
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-xl">7 DAY VIEW</span>
                     </div>
                  </div>
                  <div className="h-72 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData}>
                           <defs>
                              <linearGradient id="colorMissions" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                 <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                           <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '12px' }}
                           />
                           <Area type="monotone" dataKey="missions" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorMissions)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Right Column: Top Performers */}
            <div className="space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
                  <h3 className="text-lg font-black text-secondary tracking-tight mb-8">Clinical Elite</h3>
                  <div className="space-y-6">
                     {nurses.slice(0, 5).map((nurse, i) => (
                        <div key={i} className="flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                 <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-gray-300 text-xs overflow-hidden group-hover:border-red-200 transition-all">
                                    {nurse.firstName[0]}{nurse.lastName[0]}
                                 </div>
                                 <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                 </div>
                              </div>
                              <div>
                                 <p className="text-xs font-black text-secondary uppercase tracking-tight group-hover:text-red-600 transition-all">{nurse.firstName} {nurse.lastName}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex gap-0.5">
                                       {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                                    </div>
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{Math.floor(Math.random() * 20) + 80} Missions</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black text-secondary">98%</p>
                              <p className="text-[8px] font-bold text-gray-300 uppercase">Outcome</p>
                           </div>
                        </div>
                     ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-8 h-12 rounded-2xl bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">
                     View Full League Table
                  </Button>
               </div>

               <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-red-200 relative overflow-hidden">
                  <Medal className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
                  <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">Training Pulse</h3>
                  <p className="text-red-100/60 text-xs font-medium mb-8 leading-relaxed">
                     Monitor continuous medical education and certification compliance across the nursing department.
                  </p>
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>ALS Certification</span>
                        <span>82%</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-[82%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                     </div>
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>Trauma Response</span>
                        <span>64%</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 w-[64%] rounded-full" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
