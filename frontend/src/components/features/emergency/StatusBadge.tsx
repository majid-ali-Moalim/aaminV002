import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  UserCheck, 
  Navigation, 
  Building2, 
  CheckCircle, 
  XCircle, 
  AlertOctagon 
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { 
          bg: 'bg-amber-100 border-amber-200', 
          text: 'text-amber-800', 
          icon: Clock, 
          label: 'Pending' 
        };
      case 'ASSIGNED':
        return { 
          bg: 'bg-blue-100 border-blue-200', 
          text: 'text-blue-800', 
          icon: UserCheck, 
          label: 'Assigned' 
        };
      case 'DISPATCHED':
      case 'EN_ROUTE':
      case 'ARRIVED_SCENE':
      case 'PATIENT_STABILIZED':
      case 'TRANSPORTING':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: Truck,
          label: 'In progress',
        };
      case 'ARRIVED_HOSPITAL':
        return {
          bg: 'bg-emerald-100 border-emerald-200',
          text: 'text-emerald-800',
          icon: Building2,
          label: 'At hospital',
        };
      case 'REVIEWING':
        return {
          bg: 'bg-amber-100 border-amber-200',
          text: 'text-amber-800',
          icon: Clock,
          label: 'Reviewing',
        };
      case 'ON_THE_WAY':
        return { 
          bg: 'bg-indigo-100 border-indigo-200', 
          text: 'text-indigo-800', 
          icon: Truck, 
          label: 'On the Way' 
        };
      case 'ARRIVED':
        return { 
          bg: 'bg-purple-100 border-purple-200', 
          text: 'text-purple-800', 
          icon: MapPin, 
          label: 'Arrived at Scene' 
        };
      case 'PICKED_UP':
        return { 
          bg: 'bg-teal-100 border-teal-200', 
          text: 'text-teal-800', 
          icon: UserCheck, 
          label: 'Patient Picked Up' 
        };
      case 'TRANSPORTING':
        return { 
          bg: 'bg-cyan-100 border-cyan-200', 
          text: 'text-cyan-800', 
          icon: Navigation, 
          label: 'Transporting' 
        };
      case 'AT_HOSPITAL':
        return { 
          bg: 'bg-emerald-100 border-emerald-200', 
          text: 'text-emerald-800', 
          icon: Building2, 
          label: 'At Hospital' 
        };
      case 'COMPLETED':
        return { 
          bg: 'bg-slate-100 border-slate-200', 
          text: 'text-slate-800', 
          icon: CheckCircle, 
          label: 'Completed' 
        };
      case 'CANCELLED':
        return { 
          bg: 'bg-red-50 border-red-100', 
          text: 'text-red-700', 
          icon: XCircle, 
          label: 'Cancelled' 
        };
      case 'FAILED':
        return { 
          bg: 'bg-rose-100 border-rose-200', 
          text: 'text-rose-800', 
          icon: AlertOctagon, 
          label: 'Failed' 
        };
      default:
        return { 
          bg: 'bg-gray-100 border-gray-200', 
          text: 'text-gray-800', 
          icon: Clock, 
          label: status.replace(/_/g, ' ') 
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[9px] gap-1',
    md: 'px-2.5 py-1 text-[10px] gap-1.5',
    lg: 'px-3.5 py-1.5 text-[11px] gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <div className={`flex items-center font-black uppercase tracking-widest border rounded shadow-sm ${config.bg} ${config.text} ${sizeStyles[size]}`}>
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  );
};

export default StatusBadge;
