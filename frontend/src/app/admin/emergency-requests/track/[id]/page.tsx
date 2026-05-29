'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Activity, MapPin, Clock, Car, User, Building2, ArrowLeft, 
  CheckCircle2, AlertCircle, FileText, Stethoscope, 
  ShieldAlert, RefreshCw, WifiOff
} from 'lucide-react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const STATUS_ORDER = [
  'PENDING', 'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE',
  'ARRIVED_SCENE', 'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED'
];

export default function InternalTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let socket: Socket;
    let pollingInterval: NodeJS.Timeout;

    const fetchInternalData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/api/emergency-requests/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Internal tracking data not found');
        const json = await res.json();
        setData(json);
        
        // Setup WebSocket using the trackingCode
        if (!socket && json.trackingCode) {
          socket = io(BACKEND_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
          });
          
          socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join-tracking', json.trackingCode);
            // Re-fetch to guarantee no missed events during disconnect
            fetchInternalData();
          });

          socket.on('tracking-update', () => {
            // Internal view requires full payload, so we re-fetch from the secure API
            // instead of using the sanitized tracking payload broadcasted via WS
            fetchInternalData();
          });

          socket.on('disconnect', () => setIsConnected(false));
        }

        // Fallback polling
        pollingInterval = setInterval(() => {
          if (!socket?.connected) fetchInternalData();
        }, 15000);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInternalData();

    return () => {
      if (socket) socket.disconnect();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500 animate-pulse">Loading internal operational tracker...</div>;
  if (error || !data) return <div className="p-8 text-red-600 font-bold">Error: {error}</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-12">
      {/* Internal Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <ShieldAlert className="text-red-500" size={24} />
          <div>
            <h1 className="font-bold text-lg leading-tight">Operational Tracking Mode</h1>
            <p className="text-xs text-slate-400 font-medium">Internal View - Confidential Data Displayed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isConnected && <span className="flex items-center gap-1 text-xs text-slate-400"><WifiOff size={14} /> Offline</span>}
          {isConnected && <span className="flex items-center gap-1 text-xs text-green-400 animate-pulse"><CheckCircle2 size={14} /> Live Sync</span>}
          <div className={`px-3 py-1 rounded border text-xs font-bold ${data.priority === 'CRITICAL' ? 'bg-red-900/50 text-red-400 border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
            {data.priority}
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Details & Internal Notes */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-black text-slate-900">{data.trackingCode}</h2>
              <p className="text-slate-500 mt-1">Patient: <span className="font-bold text-slate-700">{data.patient?.fullName}</span> | Phone: {data.patient?.phone}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><MapPin size={16} /> {data.pickupLocation}</span>
                <span className="flex items-center gap-1"><Building2 size={16} /> {data.destinationHospital?.name || 'Unassigned'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 font-bold text-slate-700 mb-2">
                {data.status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dispatcher Notes */}
            <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-5">
              <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                <FileText size={18} /> Dispatcher Notes (Internal)
              </h3>
              <p className="text-sm text-yellow-800 whitespace-pre-wrap">{data.manualDispatchNotes || data.notes || 'No dispatcher notes available.'}</p>
              <div className="mt-4 pt-4 border-t border-yellow-200/50 text-xs text-yellow-700 flex justify-between">
                <span>Dispatcher: {data.dispatcher?.user?.username || 'System'}</span>
                <span>Created: {new Date(data.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Clinical Information */}
            <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-5">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Stethoscope size={18} /> Clinical Info (Confidential)
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li><strong>Symptoms:</strong> {data.symptoms || 'N/A'}</li>
                <li><strong>Condition:</strong> {data.patientCondition || 'N/A'}</li>
                <li><strong>Conscious:</strong> {data.consciousStatus || 'N/A'}</li>
                <li><strong>Breathing:</strong> {data.breathingStatus || 'N/A'}</li>
                <li><strong>Requirements:</strong> {data.needsOxygen ? 'Oxygen ' : ''}{data.needsStretcher ? 'Stretcher' : ''}</li>
              </ul>
            </div>
          </div>

          {/* Detailed Assignment History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User size={18} /> Operational Assignments
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Ambulance</p>
                <p className="font-semibold">{data.ambulance?.ambulanceNumber || 'Unassigned'}</p>
                <p className="text-xs text-slate-500">{data.ambulance?.vehicleType}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Driver</p>
                <p className="font-semibold">{data.driver ? `${data.driver.firstName || ''} ${data.driver.lastName || ''}` : 'Unassigned'}</p>
                <p className="text-xs text-slate-500">{data.driver?.phone || 'No Phone'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Nurse</p>
                <p className="font-semibold">{data.nurse ? `${data.nurse.firstName || ''} ${data.nurse.lastName || ''}` : 'Unassigned'}</p>
                <p className="text-xs text-slate-500">{data.nurse?.phone || 'No Phone'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Status Logs */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock size={18} /> Complete Status Audit
            </h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
              {data.statusLogs?.map((log: any, idx: number) => (
                <div key={log.id} className="relative flex items-start pl-8 group">
                  <div className="absolute left-0 w-4 h-4 rounded-full border-2 border-white bg-slate-400 ml-0.5 shadow-sm"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{log.toStatus}</p>
                    <p className="text-xs text-slate-500 mb-1">{new Date(log.createdAt).toLocaleString()}</p>
                    {log.notes && (
                      <div className="mt-2 text-xs bg-slate-50 border border-slate-100 p-2 rounded text-slate-600">
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
