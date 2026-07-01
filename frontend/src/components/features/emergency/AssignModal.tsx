import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Truck, 
  User, 
  UserPlus, 
  CheckCircle, 
  Trash2, 
  Filter,
  Loader2,
  HeartPulse,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emergencyRequestsService } from '@/lib/api';
import { dispatcherDashboardApi } from '@/lib/dispatcherApi';
import { EmergencyRequest, Ambulance, Employee } from '@/types';
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel';

interface AssignModalProps {
  request: EmergencyRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignModal: React.FC<AssignModalProps> = ({ request, onClose, onSuccess }) => {
  const pathname = usePathname();
  const isDispatcherPortal = pathname?.startsWith('/dispatcher');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUnits, setIsFetchingUnits] = useState(false);
  const [availableAmbulances, setAvailableAmbulances] = useState<Ambulance[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Employee[]>([]);
  const [availableNurses, setAvailableNurses] = useState<Employee[]>([]);
  
  const [assignmentParams, setAssignmentParams] = useState({
    ambulanceId: '',
    driverId: '',
    nurseId: '',
  });

  const filterDispatchReady = (staff: Employee[]) =>
    staff.filter((member) => member.assignedAmbulanceId || member.assignedAmbulance)

  const fetchUnits = async () => {
    try {
      setIsFetchingUnits(true);
      let readyDrivers: Employee[] = [];

      if (isDispatcherPortal) {
        const regional = await dispatcherDashboardApi.getAssignableResources();
        setAvailableAmbulances(regional.ambulances ?? []);
        readyDrivers = filterDispatchReady(regional.drivers ?? []);
        setAvailableDrivers(readyDrivers);
        setAvailableNurses(filterDispatchReady(regional.nurses ?? []));
      } else {
        const [ambulances, drivers, nurses] = await Promise.all([
          emergencyRequestsService.getAvailableAmbulances(),
          emergencyRequestsService.getAvailableDrivers(),
          emergencyRequestsService.getAvailableNurses(),
        ]);
        setAvailableAmbulances(ambulances);
        readyDrivers = filterDispatchReady(drivers);
        setAvailableDrivers(readyDrivers);
        setAvailableNurses(filterDispatchReady(nurses));
      }

      if (readyDrivers.length > 0 && !assignmentParams.driverId) {
        setAssignmentParams(prev => ({
          ...prev,
          driverId: readyDrivers[0].id,
          ambulanceId: readyDrivers[0].assignedAmbulanceId || '',
        }));
      }
    } catch (err) {
      console.error('Failed to fetch available units:', err);
    } finally {
      setIsFetchingUnits(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async () => {
    if (!assignmentParams.driverId) {
      return alert('Please select a driver');
    }
    if (!assignmentParams.nurseId) {
      return alert('Please select a nurse — both driver and nurse are required for dispatch');
    }

    const selectedDriver = availableDrivers.find(d => d.id === assignmentParams.driverId);
    const ambulanceId = selectedDriver?.assignedAmbulanceId || assignmentParams.ambulanceId;

    if (!ambulanceId) {
      return alert('No ambulance assigned. Please select an ambulance or a driver with an assigned ambulance.');
    }

    try {
      setIsSubmitting(true);
      await emergencyRequestsService.assignAmbulance(
        request.id,
        ambulanceId,
        assignmentParams.driverId,
        assignmentParams.nurseId
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`Assignment failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDriver = availableDrivers.find(d => d.id === assignmentParams.driverId);
  const selectedNurse = availableNurses.find(n => n.id === assignmentParams.nurseId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl">
              <Truck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Assign Dispatch Team</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case:</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{request.trackingCode}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-bold text-slate-900">
                  {selectedDriver?.assignedAmbulance?.ambulanceNumber || 'Pending Selection'}
                </h4>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 text-[10px] font-bold uppercase rounded-lg border border-emerald-200">System Priority</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Driver</span>
                <p className="font-bold text-slate-700 text-lg">
                  {selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : 'Select a driver below'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm min-w-[240px]">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                <p className="text-xs font-bold text-slate-700 line-clamp-1">{request.pickupLocation}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</p>
                <p className="text-xs font-bold text-red-600">{request.priority}</p>
              </div>
            </div>
          </div>

          <PickupGpsPanel
            request={request}
            title="Patient shared GPS — send to assigned driver"
          />

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Driver Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex-1">Select available Driver</h3>
                <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {isFetchingUnits && availableDrivers.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Scanning network...</span>
                  </div>
                ) : availableDrivers.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-red-400 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                    No available drivers with an assigned ambulance
                  </div>
                ) : availableDrivers.map(driver => (
                  <div
                    key={driver.id}
                    onClick={() => setAssignmentParams(prev => ({ ...prev, driverId: driver.id, ambulanceId: driver.assignedAmbulanceId || prev.ambulanceId }))}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${assignmentParams.driverId === driver.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800">{driver.firstName} {driver.lastName}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                          {driver.assignedAmbulance ? `Vehicle: ${driver.assignedAmbulance.ambulanceNumber}` : 'No vehicle assigned'}
                        </p>
                      </div>
                      {assignmentParams.driverId === driver.id && (
                        <div className="bg-blue-500 rounded-full p-1 shadow-lg shadow-blue-200">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nurse Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex-1">
                  Select available Nurse <span className="text-red-600">*</span>
                </h3>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {isFetchingUnits && availableNurses.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Scanning network...</span>
                  </div>
                ) : availableNurses.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                    No available nurses with an assigned ambulance
                  </div>
                ) : availableNurses.map(nurse => (
                  <div
                    key={nurse.id}
                    onClick={() => setAssignmentParams(prev => ({ ...prev, nurseId: nurse.id }))}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${assignmentParams.nurseId === nurse.id
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <HeartPulse className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800">{nurse.firstName} {nurse.lastName}</h4>
                        <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-wider">
                          {nurse.assignedAmbulance
                            ? `Vehicle: ${nurse.assignedAmbulance.ambulanceNumber}`
                            : 'No vehicle assigned'}
                        </p>
                      </div>
                      {assignmentParams.nurseId === nurse.id && (
                        <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-200">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center sm:text-left">
            <span>Assignment Queue Ready</span>
            <p className="text-blue-500 mt-0.5">
              {selectedDriver?.assignedAmbulance?.ambulanceNumber || 'UNITS-TBD'} / {selectedDriver?.firstName || 'STAFF-TBD'}
              {selectedNurse ? ` + ${selectedNurse.firstName}` : ' + Nurse required'}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              onClick={onClose} 
              variant="ghost"
              className="flex-1 sm:flex-none px-8 h-12 text-slate-500 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isSubmitting || !assignmentParams.driverId || !assignmentParams.nurseId}
              className="flex-1 sm:flex-none px-8 h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Confirm Dispatch'}
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
};

export default AssignModal;
