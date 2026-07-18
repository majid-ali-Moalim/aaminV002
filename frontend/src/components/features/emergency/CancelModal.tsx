import React, { useState } from 'react';
import { 
  XCircle, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { emergencyRequestsService } from '@/lib/api';
import { EmergencyRequest } from '@/types';

interface CancelModalProps {
  request: EmergencyRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({ request, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!reason.trim()) {
      return alert('Please provide a reason for cancellation');
    }

    try {
      setIsSubmitting(true);
      await emergencyRequestsService.cancelRequest(request.id, reason);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`Cancellation failed: ${error.message}`);
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
            Abort Mission / Terminate Request
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 p-4 border border-red-100 rounded">
            <p className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-1">Warning</p>
            <p className="text-xs text-red-700 font-bold leading-relaxed">
              You are about to cancel emergency request <span className="font-black underline">{request.trackingCode}</span>. This action is irreversible and will be logged in the system audit trail.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reason for Termination</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed reason for cancellation (e.g., False alarm, Request handled by other agency, etc.)"
              className="active-missions-field w-full h-32 p-3 bg-gray-50 border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-sm resize-none transition-colors rounded-xl"
              required
            />
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
            disabled={isSubmitting || !reason.trim()}
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
