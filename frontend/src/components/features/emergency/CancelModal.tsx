import React, { useEffect, useMemo, useState } from 'react';
import {
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emergencyRequestsService } from '@/lib/api';
import { EmergencyRequest } from '@/types';
import {
  buildCancellationReasonText,
  fetchCancellationReasons,
  isOtherCancellationReason,
  type CancellationReasonOption,
} from '@/lib/emergency/cancellationReasons';

interface CancelModalProps {
  request: EmergencyRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({ request, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [reasons, setReasons] = useState<CancellationReasonOption[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [otherDetail, setOtherDetail] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingReasons(true);
      try {
        const rows = await fetchCancellationReasons();
        if (!cancelled) {
          setReasons(rows);
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load cancellation reasons');
        }
      } finally {
        if (!cancelled) {
          setLoadingReasons(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedReason = useMemo(
    () => reasons.find((r) => r.id === selectedReasonId),
    [reasons, selectedReasonId],
  );
  const showOtherDetail = selectedReason && isOtherCancellationReason(selectedReason);

  const canSubmit = useMemo(() => {
    if (!selectedReasonId || loadingReasons) return false;
    if (showOtherDetail) return otherDetail.trim().length > 0;
    return true;
  }, [selectedReasonId, loadingReasons, showOtherDetail, otherDetail]);

  const handleCancel = async () => {
    if (!selectedReasonId) {
      toast.error('Please select a cancellation reason');
      return;
    }
    if (showOtherDetail && !otherDetail.trim()) {
      toast.error('Please provide details for the other reason');
      return;
    }

    const reasonText = buildCancellationReasonText(selectedReason, otherDetail);

    try {
      setIsSubmitting(true);
      await emergencyRequestsService.cancelRequest(request.id, reasonText);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cancellation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-[130] p-4">
      <div className="active-missions-modal bg-white w-full max-w-[450px] border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-[#EF4444] p-4 flex items-center justify-between">
          <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Cancel Case
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 p-4 border border-red-100 rounded">
            <p className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-1">Warning</p>
            <p className="text-xs text-red-700 font-bold leading-relaxed">
              You are about to cancel emergency request{' '}
              <span className="font-black underline">{request.trackingCode}</span>. This action is
              irreversible and will be logged in the system audit trail.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Cancellation reason
            </label>
            {loadingReasons ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading reasons from master data…
              </div>
            ) : reasons.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                No cancellation reasons configured. Add them in Admin → Master Data → Mission
                Configuration → Cancellation Reasons.
              </p>
            ) : (
              <>
                <select
                  value={selectedReasonId}
                  onChange={(e) => {
                    setSelectedReasonId(e.target.value);
                    setOtherDetail('');
                  }}
                  className="active-missions-field w-full h-11 px-3 bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-sm transition-colors rounded-xl"
                  required
                >
                  <option value="">Select cancellation reason</option>
                  {reasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.name}
                    </option>
                  ))}
                </select>
                {showOtherDetail && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      Provide details
                    </label>
                    <textarea
                      value={otherDetail}
                      onChange={(e) => setOtherDetail(e.target.value)}
                      placeholder="Describe why this case is being cancelled"
                      className="active-missions-field w-full h-28 p-3 bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-sm resize-none transition-colors rounded-xl"
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="active-missions-modal-footer bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="active-missions-btn-secondary flex-1 rounded-xl font-bold h-12"
          >
            Keep Active
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting || !canSubmit}
            className="active-missions-btn-danger flex-1 rounded-xl font-bold h-12 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
