import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Truck, 
  User, 
  CheckCircle, 
  Filter,
  Loader2,
  HeartPulse,
  XCircle,
  Stethoscope,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emergencyRequestsService, systemSetupService } from '@/lib/api';
import { dispatcherDashboardApi } from '@/lib/dispatcherApi';
import { EmergencyRequest, Ambulance, Employee } from '@/types';
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel';
import { activeShiftLabel } from '@/lib/employment/shiftTypes';
import { caseRequiresNurse } from '@/lib/emergency/caseNurseRequirement';
import { getCaseStationLabels, resourceBelongsToStation } from '@/lib/emergency/caseStationLabels';
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess';

interface AssignModalProps {
  request: EmergencyRequest;
  onClose: () => void;
  onSuccess: () => void;
  /** Reassign replaces the current driver, ambulance, and nurse on an active case */
  mode?: 'assign' | 'reassign';
}

const getAmbulanceType = (amb?: Ambulance | null) =>
  amb?.equipmentLevel?.name || amb?.vehicleType || 'Standard';

const isAdvancedType = (amb?: Ambulance | null) =>
  /advanced|als|icu|critical|intensive/i.test(getAmbulanceType(amb));

const AmbulanceTypeBadge: React.FC<{ ambulance?: Ambulance | null }> = ({ ambulance }) => {
  const advanced = isAdvancedType(ambulance);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
        advanced
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-sky-50 text-sky-700 border-sky-200'
      }`}
    >
      <Stethoscope className="w-3 h-3" />
      {getAmbulanceType(ambulance)}
    </span>
  );
};

type DispatchCrewMember = Employee & {
  isPresent?: boolean
  onCurrentShift?: boolean
  shiftName?: string
  shiftCode?: string
  dispatchEligible?: boolean
  dispatchAssignable?: boolean
  exclusionReason?: string
  exclusionDetail?: string
}

function isAssignableCrewMember(member: DispatchCrewMember): boolean {
  if (member.dispatchAssignable === false || member.dispatchEligible === false) return false
  if (member.exclusionReason === 'on_case') return false
  const shift = String(member.shiftStatus ?? '').toUpperCase()
  if (shift && shift !== 'AVAILABLE') return false
  return true
}

function CrewEligibilityBadges({ member }: { member: DispatchCrewMember }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
        Available
      </span>
      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
        On current shift
      </span>
      {member.shiftName && (
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          {member.shiftName}
        </span>
      )}
    </div>
  )
}

const AssignModal: React.FC<AssignModalProps> = ({
  request,
  onClose,
  onSuccess,
  mode = 'assign',
}) => {
  const pathname = usePathname();
  const isDispatcherPortal = pathname?.startsWith('/dispatcher');
  const { profile: dispatcherProfile } = useDispatcherAccess();
  const isReassign = mode === 'reassign';
  const { assignedStation, stationId: caseStationId } = getCaseStationLabels(request);
  const lockToCaseStation = Boolean(caseStationId);
  const [stationFilterId, setStationFilterId] = useState(caseStationId ?? '');
  const [dispatcherStationName, setDispatcherStationName] = useState<string | null>(null);
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUnits, setIsFetchingUnits] = useState(false);
  const [allAmbulances, setAllAmbulances] = useState<Ambulance[]>([]);
  const [allDrivers, setAllDrivers] = useState<DispatchCrewMember[]>([]);
  const [allNurses, setAllNurses] = useState<DispatchCrewMember[]>([]);
  
  const [assignmentParams, setAssignmentParams] = useState({
    ambulanceId: '',
    driverId: '',
    nurseId: '',
  });

  const currentDriverName = request.driver
    ? `${request.driver.firstName || ''} ${request.driver.lastName || ''}`.trim()
    : '—';
  const currentNurseName = request.nurse
    ? `${request.nurse.firstName || ''} ${request.nurse.lastName || ''}`.trim()
    : '—';
  const currentAmbulance = request.ambulance?.ambulanceNumber || '—';

  const fetchUnits = useCallback(async () => {
    try {
      setIsFetchingUnits(true);
      const excludeCaseId = request.id;
      const stationId = lockToCaseStation ? caseStationId! : stationFilterId || undefined;
      let ambulances: Ambulance[] = [];
      let drivers: DispatchCrewMember[] = [];
      let nurses: DispatchCrewMember[] = [];

      if (isDispatcherPortal) {
        const regional = await dispatcherDashboardApi.getAssignableResources(excludeCaseId);
        ambulances = regional.ambulances ?? [];
        drivers = regional.drivers ?? [];
        nurses = regional.nurses ?? [];
        setDispatcherStationName(
          regional.station?.name ?? dispatcherProfile?.station?.name ?? null,
        );
      } else {
        const [ambulancesRes, driversRes, nursesRes] = await Promise.all([
          emergencyRequestsService.getAvailableAmbulances(excludeCaseId, stationId),
          emergencyRequestsService.getAvailableDrivers(excludeCaseId, stationId),
          emergencyRequestsService.getAvailableNurses(excludeCaseId, stationId),
        ]);
        ambulances = Array.isArray(ambulancesRes) ? ambulancesRes : [];
        drivers = (Array.isArray(driversRes) ? driversRes : (driversRes?.drivers ?? [])).filter(isAssignableCrewMember);
        nurses = (Array.isArray(nursesRes) ? nursesRes : (nursesRes?.nurses ?? [])).filter(isAssignableCrewMember);
      }

      if (isDispatcherPortal) {
        drivers = drivers.filter(isAssignableCrewMember);
        nurses = nurses.filter(isAssignableCrewMember);
      }

      setAllAmbulances(ambulances);
      setAllDrivers(drivers);
      setAllNurses(nurses);

      setAssignmentParams((prev) => {
        const driverOk = !prev.driverId || drivers.some((d) => d.id === prev.driverId);
        const nurseOk = !prev.nurseId || nurses.some((n) => n.id === prev.nurseId);
        const ambOk = !prev.ambulanceId || ambulances.some((a) => a.id === prev.ambulanceId);
        const next = {
          ...prev,
          driverId: driverOk ? prev.driverId : '',
          nurseId: nurseOk ? prev.nurseId : '',
          ambulanceId: ambOk ? prev.ambulanceId : '',
        };
        // Do not auto-select — admin/dispatcher chooses crew explicitly (click again to unselect).
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch available units:', err);
    } finally {
      setIsFetchingUnits(false);
    }
  }, [isDispatcherPortal, isReassign, request.id, stationFilterId, caseStationId, lockToCaseStation, dispatcherProfile?.station?.name]);

  useEffect(() => {
    if (isDispatcherPortal) return;
    void systemSetupService.getStations().then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      setStations(
        list
          .filter((s: { id?: string; name?: string; isActive?: boolean }) => s.id && s.name && s.isActive !== false)
          .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }).catch(() => setStations([]));
  }, [isDispatcherPortal]);

  useEffect(() => {
    if (isDispatcherPortal || !lockToCaseStation || !caseStationId) return;
    setStationFilterId(caseStationId);
  }, [isDispatcherPortal, lockToCaseStation, caseStationId]);

  useEffect(() => {
    void fetchUnits();
    const interval = setInterval(() => void fetchUnits(), 5000);
    return () => clearInterval(interval);
  }, [fetchUnits]);

  const selectedStationName =
    stations.find((s) => s.id === stationFilterId)?.name ?? assignedStation ?? null;

  const availableAmbulances = allAmbulances;
  const availableDrivers = allDrivers;
  const availableNurses = allNurses;

  const emptyLocationLabel = isDispatcherPortal
    ? dispatcherStationName || dispatcherProfile?.station?.name || 'your station'
    : lockToCaseStation
      ? assignedStation || 'this case station'
      : stationFilterId
        ? selectedStationName || 'this station'
        : null;

  useEffect(() => {
    if (isDispatcherPortal) return;
    if (!stationFilterId) return;
    setAssignmentParams((prev) => {
      const driverOk = !prev.driverId || availableDrivers.some((d) => d.id === prev.driverId);
      const nurseOk = !prev.nurseId || availableNurses.some((n) => n.id === prev.nurseId);
      const ambOk = !prev.ambulanceId || availableAmbulances.some((a) => a.id === prev.ambulanceId);
      return {
        ...prev,
        driverId: driverOk ? prev.driverId : '',
        nurseId: nurseOk ? prev.nurseId : '',
        ambulanceId: ambOk ? prev.ambulanceId : '',
      };
    });
  }, [stationFilterId, availableAmbulances, availableDrivers, availableNurses]);

  const nurseRequired = caseRequiresNurse(request);

  const selectedDriver = availableDrivers.find(d => d.id === assignmentParams.driverId);
  const selectedNurse = availableNurses.find(n => n.id === assignmentParams.nurseId);
  const selectedAmbulance = availableAmbulances.find(a => a.id === assignmentParams.ambulanceId);

  const assertSelectedCrewMatchCaseStation = (): string | null => {
    if (!caseStationId) return null;
    const stationLabel = assignedStation ?? 'this case station';

    if (selectedDriver && !resourceBelongsToStation(selectedDriver, caseStationId)) {
      const theirStation = selectedDriver.station?.name ?? 'another station';
      return `Driver ${selectedDriver.firstName} ${selectedDriver.lastName} belongs to ${theirStation}, not ${stationLabel}. Cannot assign crew from a different station.`;
    }
    if (selectedNurse && !resourceBelongsToStation(selectedNurse, caseStationId)) {
      const theirStation = selectedNurse.station?.name ?? 'another station';
      return `Nurse ${selectedNurse.firstName} ${selectedNurse.lastName} belongs to ${theirStation}, not ${stationLabel}. Cannot assign crew from a different station.`;
    }
    if (selectedAmbulance && selectedAmbulance.stationId !== caseStationId) {
      const theirStation = selectedAmbulance.station?.name ?? 'another station';
      return `Ambulance ${selectedAmbulance.ambulanceNumber ?? selectedAmbulance.id} belongs to ${theirStation}, not ${stationLabel}. Cannot assign resources from a different station.`;
    }
    return null;
  };

  const handleAssign = async () => {
    if (!assignmentParams.ambulanceId) {
      return alert('Please select an ambulance');
    }
    if (!assignmentParams.driverId) {
      return alert('Please select a driver');
    }
    if (nurseRequired && !assignmentParams.nurseId) {
      return alert('Please select a nurse — this case requires a nurse before dispatch can proceed');
    }

    const stationMismatch = assertSelectedCrewMatchCaseStation();
    if (stationMismatch) {
      toast.error(stationMismatch);
      return;
    }

    const ambulanceId = assignmentParams.ambulanceId;

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
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : undefined;
      const text = Array.isArray(message) ? message.join(', ') : message;
      const display = text || 'Unknown error';
      if (/already on active case|cannot be assigned|different station/i.test(display)) {
        toast.error(display);
      } else {
        alert(`${isReassign ? 'Reassignment' : 'Assignment'} failed: ${display}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isReassign ? 'bg-amber-50' : 'bg-red-50'}`}>
              <Truck className={`w-6 h-6 ${isReassign ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isReassign ? 'Reassign Dispatch Team' : 'Assign Dispatch Team'}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case:</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{request.trackingCode}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  Current shift: {activeShiftLabel()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isReassign
                  ? 'Select a new ambulance, driver, and nurse. Only crew marked Available (not on another case) are listed.'
                  : 'Only drivers and nurses with Available status, on the current shift, and not on another open case. Tap a selected crew member again to unselect.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {nurseRequired && (
          <div className="mx-8 mt-6 px-4 py-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-900 text-sm font-semibold">
            Nurse required — assign a nurse to this case before dispatch can proceed.
          </div>
        )}

        {!isDispatcherPortal ? (
          lockToCaseStation ? (
            <div className="mx-8 mt-6 px-4 py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-900">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Case station</p>
                  <p className="text-xs text-teal-800/90 mt-1 leading-relaxed">
                    This case is routed to{' '}
                    <span className="font-bold">{assignedStation ?? 'this station'}</span>.
                    Only ambulances and crew from this station can be assigned.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-8 mt-6 px-4 py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">Filter by station</p>
                    <p className="text-xs text-teal-800/90 mt-1 leading-relaxed">
                      Choose a station to show only its ambulances and crew, or leave as all stations.
                    </p>
                  </div>
                </div>
                <label className="shrink-0 flex flex-col gap-1 min-w-[200px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Station</span>
                  <select
                    value={stationFilterId}
                    onChange={(e) => setStationFilterId(e.target.value)}
                    className="rounded-xl border border-teal-300 bg-white px-3 py-2.5 text-sm font-semibold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">All stations</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )
        ) : (
          <div className="mx-8 mt-6 px-4 py-3 rounded-xl border border-teal-200 bg-teal-50 text-teal-900">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Your station</p>
                <p className="text-xs text-teal-800/90 mt-1 leading-relaxed">
                  Showing ambulances and crew assigned to{' '}
                  <span className="font-bold">
                    {dispatcherStationName || dispatcherProfile?.station?.name || 'your station'}
                  </span>{' '}
                  only.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {isReassign && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-3">
                Current assignment
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">Ambulance</p>
                  <p className="font-bold text-slate-800">{currentAmbulance}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">Driver</p>
                  <p className="font-bold text-slate-800">{currentDriverName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">Nurse</p>
                  <p className="font-bold text-slate-800">{currentNurseName || '—'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-2xl font-bold text-slate-900">
                  {selectedAmbulance?.ambulanceNumber || 'Pending Selection'}
                </h4>
                {selectedAmbulance && <AmbulanceTypeBadge ambulance={selectedAmbulance} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {isReassign ? 'New Primary Driver' : 'Primary Driver'}
                </span>
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

          {/* Ambulance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-red-500 rounded-full" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex-1">
                Select available Ambulance <span className="text-red-600">*</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Type: Basic / Advanced
              </span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {isFetchingUnits && availableAmbulances.length === 0 ? (
                <div className="col-span-full h-24 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Scanning fleet...</span>
                </div>
              ) : availableAmbulances.length === 0 ? (
                <div className="col-span-full h-24 flex items-center justify-center text-red-400 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                  {emptyLocationLabel
                    ? `No available ambulances at ${emptyLocationLabel}`
                    : 'No available ambulances'}
                </div>
              ) : availableAmbulances.map(amb => (
                <div
                  key={amb.id}
                  onClick={() =>
                    setAssignmentParams((prev) => ({
                      ...prev,
                      ambulanceId: prev.ambulanceId === amb.id ? '' : amb.id,
                    }))
                  }
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${assignmentParams.ambulanceId === amb.id
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800">{amb.ambulanceNumber}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{amb.plateNumber}</p>
                      <div className="mt-2"><AmbulanceTypeBadge ambulance={amb} /></div>
                    </div>
                    {assignmentParams.ambulanceId === amb.id && (
                      <div className="bg-red-500 rounded-full p-1 shadow-lg shadow-red-200 shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                  <div className="h-32 flex flex-col items-center justify-center text-amber-700 text-[10px] font-bold uppercase tracking-widest text-center px-4 gap-1">
                    <span>
                      {emptyLocationLabel
                        ? `No eligible drivers at ${emptyLocationLabel}`
                        : 'No eligible drivers'}
                    </span>
                    <span className="normal-case font-medium text-slate-500">Crew must be Available and not assigned to another case</span>
                  </div>
                ) : availableDrivers.map(driver => (
                  <div
                    key={driver.id}
                    onClick={() =>
                      setAssignmentParams((prev) => ({
                        ...prev,
                        driverId: prev.driverId === driver.id ? '' : driver.id,
                      }))
                    }
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
                        <CrewEligibilityBadges member={driver} />
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
                  <div className="h-32 flex flex-col items-center justify-center text-amber-700 text-[10px] font-bold uppercase tracking-widest text-center px-4 gap-1">
                    <span>
                      {emptyLocationLabel
                        ? `No eligible nurses at ${emptyLocationLabel}`
                        : 'No eligible nurses'}
                    </span>
                    <span className="normal-case font-medium text-slate-500">Crew must be Available and not assigned to another case</span>
                  </div>
                ) : availableNurses.map(nurse => (
                  <div
                    key={nurse.id}
                    onClick={() =>
                      setAssignmentParams((prev) => ({
                        ...prev,
                        nurseId: prev.nurseId === nurse.id ? '' : nurse.id,
                      }))
                    }
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
                        <CrewEligibilityBadges member={nurse} />
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
            <span>{isReassign ? 'Reassignment Queue Ready' : 'Assignment Queue Ready'}</span>
            <p className="text-blue-500 mt-0.5">
              {selectedAmbulance?.ambulanceNumber || 'UNITS-TBD'} / {selectedDriver?.firstName || 'STAFF-TBD'}
              {selectedNurse
                ? ` + ${selectedNurse.firstName}`
                : nurseRequired
                  ? ' + Nurse required'
                  : ''}
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
              disabled={
                isSubmitting ||
                !assignmentParams.ambulanceId ||
                !assignmentParams.driverId ||
                (nurseRequired && !assignmentParams.nurseId)
              }
              className={`flex-1 sm:flex-none px-8 h-12 text-white font-bold uppercase text-xs tracking-widest rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                isReassign
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isReassign ? (
                'Confirm Reassign'
              ) : (
                'Confirm Dispatch'
              )}
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
