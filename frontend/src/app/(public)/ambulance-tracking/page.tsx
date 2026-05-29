'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Search, MapPin, Clock, Phone, User, Truck, CheckCircle, 
  AlertCircle, Activity, Loader2, Navigation, Heart, Shield,
  ArrowRight, Info, ChevronRight, Share2, ExternalLink,
  Users, Siren, Wind, Map, Car, Calendar, Briefcase, FileText
} from 'lucide-react'
import { emergencyRequestsService } from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'

const API_BASE_URL = 'http://localhost:3001'

// --- Premium Styling Constants ---
const COLORS = {
  bg: '#F8F9FF',
  primary: '#1E293B',
  accent: '#EF4444',
  secondary: '#3B82F6',
  glass: 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]',
  card: 'bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50',
}

function TrackingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [trackingCode, setTrackingCode] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [trackingData, setTrackingData] = useState<any>(null)
  const [error, setError] = useState('')

  // Check for code in URL on mount
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setTrackingCode(code.toUpperCase())
      handleTrack(undefined, code.toUpperCase())
    }
  }, [searchParams])

  const handleTrack = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault()
    setError('')
    
    const targetCode = codeOverride || trackingCode.trim()
    if (!targetCode) {
      setError('Please enter your unique tracking code')
      return
    }

    setIsTracking(true)

    try {
      const data = await emergencyRequestsService.getByTrackingCode(targetCode.toUpperCase())
      setTrackingData(data)
      if (!data) {
         setError('No active request found with this code. Please verify and try again.')
      } else {
        // Update URL without refreshing
        const url = new URL(window.location.href)
        url.searchParams.set('code', targetCode.toUpperCase())
        window.history.pushState({}, '', url)
      }
    } catch (err: any) {
      console.error('Tracking error:', err)
      setError(err.response?.data?.message || 'Unable to retrieve tracking details. Please ensure the code is correct.')
      setTrackingData(null)
    } finally {
      setIsTracking(false)
    }
  }

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getStatusProgress = (status: string) => {
    const steps = ['PENDING', 'ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED']
    const idx = steps.indexOf(status)
    return Math.max(0, (idx / (steps.length - 1)) * 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-500 bg-amber-50 border-amber-500/20'
      case 'ASSIGNED': return 'text-blue-500 bg-blue-50 border-blue-500/20'
      case 'DISPATCHED': return 'text-red-600 bg-red-50 border-red-600/20'
      case 'ARRIVED_SCENE': return 'text-purple-500 bg-purple-50 border-purple-500/20'
      case 'TRANSPORTING': return 'text-blue-600 bg-blue-50 border-blue-600/20'
      case 'ARRIVED_HOSPITAL': return 'text-sky-500 bg-sky-50 border-sky-500/20'
      case 'COMPLETED': return 'text-emerald-500 bg-emerald-50 border-emerald-500/20'
      default: return 'text-gray-500 bg-gray-50 border-gray-500/20'
    }
  }

  const displayStatus = useMemo(() => {
    if (!trackingData) return ''
    const status = trackingData.status.replace('_', ' ')
    if (status === 'TRANSPORTING') return 'En Route (In Transit)'
    return status.charAt(0) + status.slice(1).toLowerCase()
  }, [trackingData])

  return (
    <div className="min-h-screen bg-[#F0F2FF] text-[#1E293B] font-['Outfit',_sans-serif]">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-red-500 p-2 rounded-xl shadow-lg shadow-red-200">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Aamin <span className="text-red-500">Ambulance</span></h1>
          </div>
          
          {trackingData && (
            <div className="bg-[#5B7FFF]/10 border border-[#5B7FFF]/20 px-6 py-2.5 rounded-full flex items-center gap-3">
              <div className="w-2 h-2 bg-[#5B7FFF] rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-[#5B7FFF]">Live tracking for Emergency Request #{trackingData.trackingCode}</span>
            </div>
          )}

          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-red-200"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {!trackingData ? (
          <div className="max-w-2xl mx-auto mt-20 text-center">
             <div className="inline-flex p-6 bg-white rounded-[2rem] shadow-xl mb-10">
                <Truck className="w-16 h-16 text-red-500 animate-bounce-subtle" />
             </div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Track Your <span className="text-red-500">Ambulance</span></h2>
             <p className="text-lg text-slate-500 mb-10 font-medium">Enter your 7-character tracking code to see live mission updates.</p>
             
             <form onSubmit={handleTrack} className="bg-white p-3 rounded-[1.5rem] shadow-2xl border border-slate-100 flex items-center gap-4">
                <div className="flex-grow relative group px-4">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                   <input 
                     type="text" 
                     value={trackingCode}
                     onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                     placeholder="Reference ID (e.g. AM-1024)"
                     className="w-full bg-transparent border-none focus:ring-0 text-xl font-bold text-slate-800 py-5 pl-10"
                   />
                </div>
                <button 
                 type="submit"
                 disabled={isTracking}
                 className="bg-red-500 hover:bg-red-600 text-white px-10 py-5 rounded-2xl font-bold text-sm shadow-xl shadow-red-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isTracking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect Tracking'}
                </button>
             </form>

             {error && (
               <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold">
                 {error}
               </div>
             )}
          </div>
        ) : (
          /* Premium Results Dashboard */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Page Header Info */}
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ambulance Tracking</h1>
              <p className="text-lg text-slate-500 font-medium tracking-tight">
                Tracking live to <span className="text-slate-900 font-bold">{trackingData.destination || 'Pacific General Hospital'}</span> for <span className="text-slate-900 font-bold">{trackingData.patient?.fullName || 'Hassan Ali'}</span>
              </p>
            </div>

            {/* Top Quick Info & Visual Timeline */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Patient Info Card */}
              <div className="lg:col-span-12 bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6 w-full max-w-2xl">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Patient Name:</label>
                    <p className="text-lg font-bold text-slate-800">{trackingData.patient?.fullName || 'Hassan Ali'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Condition:</label>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-slate-600 font-medium italic">{trackingData.patientCondition || 'Injuries from Road Accident'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Request ID:</label>
                    <p className="text-base font-bold text-slate-800">#{trackingData.trackingCode} <span className="text-slate-300 mx-2">|</span> <span className="text-slate-500 font-medium">10.68-1024</span></p>
                  </div>
                </div>

                {/* Journey Visualization */}
                <div className="w-full max-w-md flex items-center gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                      <MapPin className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Origin: KM4 Area</p>
                  </div>
                  <div className="flex-grow h-[2px] bg-slate-100 flex justify-between relative mt-[-20px]">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-md -mt-[7px] absolute left-0" />
                    <div className="w-3 h-3 rounded-full bg-slate-200 -mt-[5px] absolute left-1/4" />
                    <div className="w-3 h-3 rounded-full bg-slate-200 -mt-[5px] absolute left-2/4" />
                    <div className="w-3 h-3 rounded-full bg-slate-200 -mt-[5px] absolute left-3/4" />
                    <div className="w-4 h-4 rounded-full bg-slate-100 border-4 border-white -mt-[7px] absolute right-0" />
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 mx-auto">
                      <CheckCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{trackingData.destination?.split(' ')[0] || 'Pacific'} Hospital</p>
                  </div>
                </div>
              </div>

              {/* Ambulance Status Bar */}
              <div className="lg:col-span-12 bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="w-full md:w-2/3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ambulance <span className="text-slate-900">Status:</span></h3>
                    <div className="text-right">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ETA: Arriving in</p>
                       <p className="text-4xl font-black text-blue-600 tracking-tighter leading-none">4-6 min</p>
                    </div>
                  </div>
                  <div className="relative h-2.5 bg-slate-100 rounded-full w-full overflow-hidden mb-4">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-lg shadow-blue-200"
                      style={{ width: `${getStatusProgress(trackingData.status)}%` }}
                    />
                    {/* Status dots */}
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white self-center" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30 self-center" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    Last updated {formatDistanceToNow(new Date(trackingData.updatedAt))} ago
                  </div>
                </div>
                <div className="w-full md:w-auto text-center md:text-right">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1 leading-none">ETA: 11:23 AM (estimated)</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="lg:col-span-4 space-y-8">
                {/* Crew Card */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 pb-4 border-b border-slate-50">Ambulance & Crew Info</h3>
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Ambulance Number: #3203</p>
                      <p className="text-lg font-black text-slate-800 italic">Callsign: Aamin-5</p>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Type: Members:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                          <img 
                            src={getFullImageUrl(trackingData.nurse?.profilePhoto) || 'https://images.unsplash.com/photo-1559839734-2b71f1e3c77d?auto=format&fit=crop&q=80&w=200'} 
                            className="w-16 h-16 rounded-xl object-cover mb-3 shadow-md"
                            onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1559839734-2b71f1e3c77d?auto=format&fit=crop&q=80&w=200' }}
                          />
                          <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Nurse: {trackingData.nurse?.firstName || 'Najma'}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest">License: AA-5713</p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                          <img 
                            src={getFullImageUrl(trackingData.driver?.profilePhoto) || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200'} 
                            className="w-16 h-16 rounded-xl object-cover mb-3 shadow-md border-2 border-white"
                            onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200' }}
                          />
                          <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Driver: {trackingData.driver?.firstName || 'Mohamed'}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">ETA: Trained in Emergency</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-400 tracking-widest">License AA-5713</p>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 flex flex-col h-[500px]">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 pb-4 border-b border-slate-50">Timeline & Status Updates</h3>
                  <div className="flex-grow space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    {trackingData.statusLogs?.length > 0 ? (
                      trackingData.statusLogs.map((log: any, idx: number) => (
                        <div key={log.id} className="flex gap-4 group">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-200'}`} />
                            <div className="flex-grow w-[2px] bg-slate-50" />
                          </div>
                          <div className="pb-4">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm font-black text-slate-800 tracking-tight">{format(new Date(log.createdAt), 'hh:mm')} Ambulance {log.toStatus.replace('_', ' ')}</p>
                              <p className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{formatDistanceToNow(new Date(log.createdAt))} ago</p>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">
                               {log.notes || `Ambulance has been ${log.toStatus.toLowerCase().replace('_', ' ')} phase.`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 opacity-30">
                        <Clock className="w-10 h-10 mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">No logs found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Grid */}
              <div className="lg:col-span-4 space-y-8">
                {/* Reporting Status Card */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 pb-4 border-b border-slate-50">Current Reporting Status</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1">Current Status: <span className="text-red-500 font-black italic">{displayStatus}</span></p>
                      <p className="text-sm font-bold text-slate-500">Priority Level: <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase">CRITICAL</span></p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1">Next Update: <span className="text-slate-800 font-black">In 5 minutes</span></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Arrival: 4-6 min <span className="text-slate-300 mx-2">|</span> ETA 11:23 AM</p>
                    </div>
                    <div className="pt-6 border-t border-slate-50">
                      <p className="text-sm font-bold text-slate-500 mb-4">Dispatch Operator: <span className="text-slate-800 font-black italic">{trackingData.dispatcher?.user?.username || 'Ahmad Yusuf'}</span></p>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Reference ID:</span>
                         <span className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-black text-slate-700">AM-1024</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Small Reference Card */}
                <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex items-center gap-4">
                  <img 
                    src={getFullImageUrl(trackingData.dispatcher?.profilePhoto) || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100'} 
                    className="w-12 h-12 rounded-xl object-cover grayscale"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reference ID: AM-1024</p>
                  </div>
                </div>
              </div>

              {/* Right Sidebar Area (Asset + Performance) */}
              <div className="lg:col-span-4 space-y-8">
                {/* Ambulance Image Card */}
                <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 group shadow-sm">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src="/premium_ambulance_tracking_asset_1775249839429.png" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1587748803971-59198d3af3b5?auto=format&fit=crop&q=80&w=600' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-50 p-2.5 rounded-xl">
                          <Truck className="w-6 h-6 text-slate-700" />
                       </div>
                       <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none italic">Ambulance #3203</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Callsign: Aamin-5</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type:</span>
                          <span className="text-xs font-black text-slate-800 uppercase italic">Advanced Life Support (ALS)</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">License Plate:</span>
                          <span className="text-xs font-black text-slate-800">AA-5713</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nurse:</span>
                          <span className="text-xs font-black text-slate-800 italic">Najma Abdi</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Driver:</span>
                          <span className="text-xs font-black text-slate-800 italic shrink-0">Mohamed Ali <span className="text-[9px] text-slate-300 font-bold ml-1 uppercase">(ETA - Trained in Emergency Medical Care)</span></span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Support Info */}
                <div className="bg-[#1E293B] text-white rounded-[2rem] p-8 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Heart className="w-32 h-32 text-red-500 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-8 italic relative z-10">Emergency Guidelines</h3>
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                       <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                       <p className="text-xs font-bold text-white/70 leading-relaxed group-hover:text-white transition-colors">Clear all obstructions for ambulance access and designate a family lead info person.</p>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                       <p className="text-xs font-bold text-white/70 leading-relaxed group-hover:text-white transition-colors">Gather patient identification, medical history, and clinical documentation for crew review.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
        
        body {
          font-family: 'Outfit', sans-serif;
          background: #F0F2FF;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default function AmbulanceTrackingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-50 font-black uppercase tracking-[0.4em] text-slate-300 animate-pulse">Initializing Global Tracking Grid...</div>}>
      <TrackingContent />
    </Suspense>
  )
}
