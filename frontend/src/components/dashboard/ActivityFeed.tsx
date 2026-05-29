'use client'

import { Activity } from 'lucide-react'

interface RecentActivity {
  id: string
  type: 'emergency' | 'referral' | 'user'
  description: string
  time: string
  status: 'success' | 'warning' | 'danger'
}

export function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm h-[600px] flex flex-col relative overflow-hidden group">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
       
       <h3 className="text-sm font-black text-secondary tracking-widest uppercase mb-6 flex items-center justify-between">
          Live Intelligence
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-black tracking-widest uppercase">Live</span>
          </div>
       </h3>
       
       <div className="flex-1 overflow-y-auto space-y-5 pr-2 pt-2 custom-scrollbar">
          {activities.length === 0 && (
             <div className="flex items-center justify-center h-full text-xs font-bold text-gray-400 uppercase tracking-widest">
                No Recent Events
             </div>
          )}
          {activities.map((activity) => (
             <div key={activity.id} className="group flex gap-4 items-start p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className={`shrink-0 w-10 h-10 rounded-[14px] flex items-center justify-center shadow-sm transition-colors ${
                   activity.status === 'success' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 
                   activity.status === 'warning' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-red-50 text-red-600 group-hover:bg-red-100'
                }`}>
                   <Activity className="w-4 h-4 transition-transform group-hover:scale-110" />
                </div>
                <div>
                   <p className="text-[11px] font-black text-secondary leading-relaxed uppercase tracking-tight">"{activity.description}"</p>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 block">{activity.time}</span>
                </div>
             </div>
          ))}
       </div>
    </div>
  )
}
