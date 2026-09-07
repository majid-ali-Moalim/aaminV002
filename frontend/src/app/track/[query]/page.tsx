'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Activity, 
  MapPin, 
  Clock, 
  Car, 
  User, 
  Building2, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  RefreshCw,
  ClipboardList,
  Navigation,
  Phone,
  HeartPulse,
  Stethoscope,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const PUBLIC_TRACK_STEPS = [
  {
    key: 'received',
    label: 'Request received',
    statuses: ['PENDING', 'REVIEWING'],
  },
  {
    key: 'assigned',
    label: 'Team assigned',
    statuses: ['ASSIGNED'],
  },
  {
    key: 'in_progress',
    label: 'Case in progress',
    statuses: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE', 'PATIENT_STABILIZED', 'TRANSPORTING'],
  },
  {
    key: 'hospital',
    label: 'At hospital',
    statuses: ['ARRIVED_HOSPITAL'],
  },
  {
    key: 'complete',
    label: 'Complete',
    statuses: ['COMPLETED'],
  },
] as const

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Waiting for dispatch',
  REVIEWING: 'Being reviewed',
  ASSIGNED: 'Team assigned',
  DISPATCHED: 'Case started',
  EN_ROUTE: 'Case in progress',
  ARRIVED_SCENE: 'Case in progress',
  PATIENT_STABILIZED: 'Case in progress',
  TRANSPORTING: 'Going to hospital',
  ARRIVED_HOSPITAL: 'At hospital',
  COMPLETED: 'Complete',
  CANCELLED: 'Cancelled',
}

function stepIndexForStatus(status: string): number {
  if (status === 'CANCELLED') return -1
  const idx = PUBLIC_TRACK_STEPS.findIndex((s) => s.statuses.includes(status))
  return idx >= 0 ? idx : 0
}

function simpleStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ')
}

export default function TrackingResultPage() {
  const params = useParams();
  const router = useRouter();
  const query = decodeURIComponent(params.query as string);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tracking/${query}`);
      if (!res.ok) {
        throw new Error('Tracking data not found or expired');
      }
      const json = await res.json();
      setData(json);
      return json;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    const init = async () => {
      const initialData = await fetchData();
      if (initialData && initialData.status !== 'COMPLETED' && initialData.status !== 'CANCELLED') {
        setupWebSocket(initialData.trackingCode);
        
        // Fallback polling just in case WS completely fails or is blocked by network
        pollingInterval = setInterval(() => {
          if (!socketRef.current?.connected) {
            fetchData();
          }
        }, 30000); // 30 seconds
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [query]);

  const setupWebSocket = (trackingCode: string) => {
    // Advanced Socket Resilience config
    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-tracking', trackingCode);
      // Fetch fresh data on reconnect to cover gap
      fetchData();
    });

    socket.on('tracking-update', (updatedData: any) => {
      setData(updatedData);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });
  };

  // UI Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'REVIEWING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISPATCHED':
      case 'EN_ROUTE': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ARRIVED_SCENE':
      case 'PATIENT_STABILIZED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TRANSPORTING': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'ARRIVED_HOSPITAL':
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIconContent = (stepIndex: number, currentIndex: number, cancelled: boolean) => {
    if (cancelled) return <AlertCircle size={12} className="text-white" />
    if (stepIndex < currentIndex) return <CheckCircle2 size={12} className="text-green-600" />
    if (stepIndex === currentIndex) return <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
    return <div className="w-2 h-2 bg-slate-300 rounded-full" />
  }

  const currentStepIndex = stepIndexForStatus(data?.status ?? 'PENDING')
  const isCancelled = data?.status === 'CANCELLED'
  const driverInfo =
    data?.driver && typeof data.driver === 'object'
      ? data.driver
      : data?.driver
        ? { name: String(data.driver), phone: null }
        : null
  const nurseInfo =
    data?.nurse && typeof data.nurse === 'object'
      ? data.nurse
      : data?.nurse
        ? { name: String(data.nurse), phone: null }
        : null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4 sm:p-8">
        <div className="max-w-4xl mx-auto w-full animate-pulse space-y-6 mt-16">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-10"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-[500px] bg-slate-200 rounded-2xl lg:col-span-1"></div>
            <div className="space-y-6 lg:col-span-2">
              <div className="h-40 bg-slate-200 rounded-2xl"></div>
              <div className="h-60 bg-slate-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Not Found</h2>
          <p className="text-slate-600 mb-6">
            {error || "We couldn't find an active case matching your tracking code or phone number."}
          </p>
          <button
            onClick={() => router.push('/track')}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            Try another search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/track" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md transition-colors ${data.priorityLevel === 'CRITICAL' ? 'bg-red-600 animate-pulse' : 'bg-slate-800'}`}>
              <Activity size={18} />
            </div>
            <h1 className="font-bold text-lg text-slate-900 leading-tight">Tracking Patient</h1>
          </div>
          
          <div className="w-20 flex justify-end">
            {['COMPLETED', 'CANCELLED'].includes(data.status) ? (
               <div className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> Done</div>
            ) : isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                <WifiOff size={12} />
                Offline
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* Priority Banner if Critical */}
        {data.priorityLevel === 'CRITICAL' && data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
          <div className="mb-6 bg-red-600 text-white p-3 rounded-xl shadow-md flex items-center justify-center gap-2 animate-pulse">
            <AlertCircle size={20} />
            <span className="font-bold tracking-wide">CRITICAL EMERGENCY DISPATCH</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:sticky lg:top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="text-red-600" size={20} />
                  Status Timeline
                </span>
                {!isConnected && !['COMPLETED', 'CANCELLED'].includes(data.status) && (
                  <button onClick={fetchData} className="text-slate-400 hover:text-slate-600">
                    <RefreshCw size={16} />
                  </button>
                )}
              </h3>
              
              <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {PUBLIC_TRACK_STEPS.map((step, index) => {
                  const isPast = !isCancelled && index < currentStepIndex
                  const isCurrent = !isCancelled && index === currentStepIndex
                  const isFuture = isCancelled || index > currentStepIndex

                  const timelineEvent = data.timeline?.find((t: { status: string; timestamp: string }) =>
                    step.statuses.includes(t.status),
                  )

                  return (
                    <div key={step.key} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500">
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full border border-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 -ml-2.5 sm:-ml-0 z-10 transition-colors ${
                        isPast ? 'bg-green-100 border-green-200' : isCurrent ? 'bg-red-100 border-red-300 ring-4 ring-red-50' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {getStatusIconContent(index, currentStepIndex, isCancelled)}
                      </div>

                      <div className={`w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] transition-all duration-500 ${isFuture ? 'opacity-40' : 'opacity-100'}`}>
                        <div className={`flex flex-col rounded-xl transition-all duration-300 ${isCurrent ? 'bg-red-50 p-4 border border-red-100 shadow-sm' : isPast ? 'py-1' : ''}`}>
                          <span className={`font-semibold text-sm ${isCurrent ? 'text-red-700' : isPast ? 'text-slate-900' : 'text-slate-500'}`}>
                            {step.label}
                          </span>
                          {(timelineEvent || isCurrent) && (
                            <span className={`text-xs mt-1 flex items-center gap-1 ${isCurrent ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                              <Clock size={12} />
                              {timelineEvent
                                ? new Date(timelineEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : isCurrent
                                  ? 'In progress'
                                  : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isCancelled && (
                  <div className="relative flex items-center gap-3 text-sm text-slate-600 bg-slate-100 rounded-xl p-3 border border-slate-200">
                    <AlertCircle size={16} />
                    This case was cancelled.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Case Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Activity size={120} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{data.trackingCode}</h2>
                  <p className="text-slate-500 mt-1 text-sm">Requested: {new Date(data.requestTime).toLocaleDateString()} at {new Date(data.requestTime).toLocaleTimeString()}</p>
                </div>
                <div className={`px-4 py-2 rounded-full border font-bold text-sm text-center shadow-sm ${getStatusColor(data.status)}`}>
                  {simpleStatusLabel(data.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 sm:col-span-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Station</p>
                    <p className="font-bold text-slate-900">{data.station || 'Not assigned yet'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pickup area</p>
                    <p className="font-bold text-slate-900">{data.landmark || 'Location provided'}</p>
                    {(data.district || data.region) && (
                      <p className="text-xs text-slate-500">{[data.district, data.region].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                    <Building2 size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital</p>
                    <p className="font-bold text-slate-900">{data.hospital || 'To be confirmed'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Your crew</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Driver</p>
                  <p className="font-bold text-slate-900">{driverInfo?.name || 'Not assigned'}</p>
                  {driverInfo?.phone ? (
                    <a href={`tel:${driverInfo.phone}`} className="inline-flex items-center gap-1 text-sm text-red-600 font-semibold mt-2">
                      <Phone size={14} /> {driverInfo.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">Phone shared when assigned</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nurse</p>
                  <p className="font-bold text-slate-900">{nurseInfo?.name || 'Not assigned'}</p>
                  {nurseInfo?.phone ? (
                    <a href={`tel:${nurseInfo.phone}`} className="inline-flex items-center gap-1 text-sm text-red-600 font-semibold mt-2">
                      <Phone size={14} /> {nurseInfo.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">Phone shared when assigned</p>
                  )}
                </div>
              </div>
              {data.ambulance?.code && (
                <p className="text-sm text-slate-600 mt-4">
                  Ambulance: <span className="font-bold text-slate-900">{data.ambulance.code}</span>
                </p>
              )}
            </div>

            <div className="bg-blue-50 text-blue-800 text-sm rounded-xl p-4 border border-blue-100 flex items-start gap-3 shadow-sm">
              <CheckCircle2 className="shrink-0 mt-0.5 text-blue-600" size={18} />
              <p className="leading-relaxed">This page updates automatically. For medical questions, speak with the hospital when the patient arrives.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
