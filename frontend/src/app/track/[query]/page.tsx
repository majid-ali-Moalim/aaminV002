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

const STATUS_ORDER = [
  'PENDING',
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
  'COMPLETED',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Request Submitted',
  REVIEWING: 'Dispatcher Reviewing',
  ASSIGNED: 'Ambulance Assigned',
  DISPATCHED: 'Team Dispatched',
  EN_ROUTE: 'En Route',
  ARRIVED_SCENE: 'Arrived at Scene',
  PATIENT_STABILIZED: 'Patient Stabilized',
  TRANSPORTING: 'Transporting Patient',
  ARRIVED_HOSPITAL: 'Arrived at Hospital',
  COMPLETED: 'Case Completed',
  CANCELLED: 'Cancelled',
};

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

  const getStatusIconContent = (status: string, currentStatus: string) => {
    if (status === 'CANCELLED') return <AlertCircle size={12} className="text-white" />;
    
    const targetIndex = STATUS_ORDER.indexOf(status);
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    
    if (targetIndex < currentIndex) return <CheckCircle2 size={12} className="text-green-600" />;
    if (targetIndex === currentIndex) return <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />;
    return <div className="w-2 h-2 bg-slate-300 rounded-full" />;
  };

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
            <h1 className="font-bold text-lg text-slate-900 leading-tight">Live Tracking</h1>
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
                {STATUS_ORDER.map((status, index) => {
                  const targetIndex = STATUS_ORDER.indexOf(status);
                  const currentIndex = STATUS_ORDER.indexOf(data.status);
                  const isPast = targetIndex < currentIndex;
                  const isCurrent = targetIndex === currentIndex;
                  const isFuture = targetIndex > currentIndex;
                  
                  // Find timestamp if it exists in timeline
                  const timelineEvent = data.timeline?.find((t: any) => t.status === status);
                  
                  return (
                    <div key={status} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500`}>
                      {/* Icon Indicator */}
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full border border-white shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 -ml-2.5 sm:-ml-0 z-10 transition-colors ${
                        isPast ? 'bg-green-100 border-green-200' : isCurrent ? 'bg-red-100 border-red-300 ring-4 ring-red-50' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {getStatusIconContent(status, data.status)}
                      </div>
                      
                      {/* Content */}
                      <div className={`w-[calc(100%-2.5rem)] md:w-[calc(50%-2rem)] transition-all duration-500 ${isFuture ? 'opacity-40 translate-x-2 md:translate-x-0 md:group-even:translate-x-2 md:group-odd:-translate-x-2' : 'opacity-100 translate-x-0'}`}>
                        <div className={`flex flex-col rounded-xl transition-all duration-300 ${isCurrent ? 'bg-red-50 p-4 border border-red-100 shadow-sm scale-[1.02]' : isPast ? 'py-1' : ''}`}>
                          <span className={`font-semibold text-sm ${isCurrent ? 'text-red-700' : isPast ? 'text-slate-900' : 'text-slate-500'}`}>
                            {STATUS_LABELS[status]}
                          </span>
                          {(timelineEvent || isCurrent) && (
                            <span className={`text-xs mt-1 flex items-center gap-1 ${isCurrent ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                              <Clock size={12} />
                              {timelineEvent ? new Date(timelineEvent.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'In Progress'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  {STATUS_LABELS[data.status] || data.status}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                    <Activity size={20} className={data.priorityLevel === 'CRITICAL' ? 'text-red-600' : 'text-slate-600'} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority Level</p>
                    <p className={`font-bold text-lg ${data.priorityLevel === 'CRITICAL' ? 'text-red-600' : 'text-slate-900'}`}>{data.priorityLevel || 'Standard'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pickup Location</p>
                    <p className="font-bold text-slate-900">{data.landmark || 'Location Provided'}</p>
                    <p className="text-xs text-slate-500">{data.district}, {data.region}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pre-Arrival Instructions (Only show before arrival) */}
            {['PENDING', 'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE'].includes(data.status) && (
              <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <AlertTriangle size={120} />
                </div>
                <h3 className="font-bold text-yellow-900 mb-4 flex items-center gap-2 relative z-10">
                  <ClipboardList className="text-yellow-700" size={20} />
                  Pre-Arrival Instructions
                </h3>
                <ul className="space-y-3 relative z-10">
                  <li className="flex items-start gap-3 text-sm text-yellow-800">
                    <div className="mt-1 w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0" />
                    <p><strong>Clear the pathway:</strong> Ensure doors are unlocked, exterior lights are on, and paths are clear for the stretcher.</p>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-yellow-800">
                    <div className="mt-1 w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0" />
                    <p><strong>Gather documents:</strong> Prepare the patient's ID, insurance, and all current medications in a bag.</p>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-yellow-800">
                    <div className="mt-1 w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0" />
                    <p><strong>Secure pets:</strong> Place all pets in a separate, closed room to ensure paramedic safety.</p>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-yellow-800">
                    <div className="mt-1 w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0" />
                    <p><strong>Stay calm:</strong> Do not attempt to move the patient unless they are in immediate, life-threatening danger.</p>
                  </li>
                </ul>
              </div>
            )}

            {/* Ambulance & Staff Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Car className="text-slate-700" size={20} />
                  Ambulance Team
                </h3>
                {data.ambulance ? (
                  <div className="space-y-4 flex-1">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle</p>
                      <p className="font-bold text-slate-900 text-lg">{data.ambulance.code}</p>
                      <p className="text-sm text-slate-600">{data.ambulance.type || 'Standard Care'}</p>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Personnel</p>
                      <div className="flex items-center gap-3 mb-3 bg-white border border-slate-100 shadow-sm rounded-lg p-2.5">
                        <div className="bg-slate-100 p-1.5 rounded-md text-slate-500"><User size={16} /></div>
                        <div>
                          <p className="text-xs text-slate-500 leading-none mb-1">Driver</p>
                          <p className="text-sm font-semibold text-slate-900 leading-none">{data.driver || 'Pending'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-lg p-2.5">
                        <div className="bg-slate-100 p-1.5 rounded-md text-slate-500"><User size={16} /></div>
                        <div>
                          <p className="text-xs text-slate-500 leading-none mb-1">Nurse</p>
                          <p className="text-sm font-semibold text-slate-900 leading-none">{data.nurse || 'Pending'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Ambulance Capabilities */}
                    <div className="pt-3 border-t border-slate-100 flex gap-2 flex-wrap mt-2">
                      {data.ambulance.type === 'Advanced Life Support' || data.priorityLevel === 'CRITICAL' ? (
                        <>
                          <span className="flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider"><HeartPulse size={12}/> ALS Equipped</span>
                          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider"><Stethoscope size={12}/> Defibrillator</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider"><Stethoscope size={12}/> BLS Equipped</span>
                          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">Oxygen</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <Car size={32} className="mb-2 opacity-50" />
                    Ambulance assignment pending
                  </div>
                )}
              </div>

              {/* Hospital Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="text-slate-700" size={20} />
                  Destination
                </h3>
                {data.hospital ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="w-12 h-12 bg-white text-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg leading-tight mb-1">{data.hospital}</p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Hospital</p>
                      </div>
                    </div>
                    
                    <div className="flex-1"></div> {/* Spacer */}

                    {data.estimatedArrival && !['COMPLETED', 'CANCELLED'].includes(data.status) && (
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-green-500 opacity-10 rounded-full -mr-8 -mt-8"></div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Clock size={14} /> Estimated Arrival
                        </p>
                        <p className="font-black text-green-900 text-3xl tracking-tight">{data.estimatedArrival}</p>
                      </div>
                    )}

                    {/* Hospital Contact & Navigation */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                      <a href={`tel:112`} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2.5 rounded-lg transition-colors">
                        <Phone size={16}/> Call ER
                      </a>
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(data.hospital)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2.5 rounded-lg transition-colors">
                        <Navigation size={16}/> Navigate
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm italic bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <Building2 size={32} className="mb-2 opacity-50" />
                    Destination hospital not yet determined
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 text-blue-800 text-sm rounded-xl p-4 border border-blue-100 flex items-start gap-3 shadow-sm">
              <CheckCircle2 className="shrink-0 mt-0.5 text-blue-600" size={18} />
              <p className="leading-relaxed font-medium">This page updates automatically. Data shown is strictly operational. For medical questions, coordinate with the receiving hospital upon arrival.</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
