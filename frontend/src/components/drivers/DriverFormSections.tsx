import React from 'react'
import { 
  User, Truck, Shield, Clock, MapPin, 
  Phone, Mail, Calendar, Info, 
  CreditCard, Upload, Eye, EyeOff, CheckCircle2,
  AlertCircle, ChevronRight, X, BookOpen, 
  Lock, Settings, Briefcase, Activity, Landmark,
  Medal, GraduationCap, FileText, UserCheck, 
  UserMinus, UserPlus, Siren, HeartPulse
} from 'lucide-react'
import { Station, Ambulance, Department, EmployeeRole, Region, District } from '@/types'
import { uploadService } from '@/lib/api'
import { toast } from 'react-hot-toast'

// --- Tactical UI Components ---

export const SectionHeader = ({ icon: Icon, title, subtitle, color = "red" }: any) => {
  const colorMap: any = {
    red: "bg-red-600 shadow-red-900/20",
    blue: "bg-blue-600 shadow-blue-900/20",
    slate: "bg-slate-700 shadow-slate-900/20",
    green: "bg-green-600 shadow-green-900/20"
  }
  
  return (
    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100/50">
      <div className={`p-2.5 rounded-xl text-white shadow-lg ${colorMap[color] || colorMap.red}`}>
        <Icon className="w-5 h-5 stroke-[2.5]" />
      </div>
      <div>
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export const TacticalBadge = ({ label, color = "blue", icon: Icon }: any) => {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100"
  }
  
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colorMap[color]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </div>
  )
}

// --- Reusable Input Components ---

export const FormInput = ({ label, required, icon: Icon, prefix, error, ...props }: any) => (
  <div className="space-y-1.5 group">
    <div className="flex items-center justify-between">
      <label className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-red-600 transition-colors">
        {label} {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>
      {error && <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">{error}</span>}
    </div>
    <div className="relative group/input">
      <div className="absolute inset-0 bg-red-600/0 border border-transparent rounded-xl transition-all group-focus-within/input:border-red-500/20 group-focus-within/input:ring-4 group-focus-within/input:ring-red-100/30" />
      <div className={`relative flex items-center h-12 bg-white border ${error ? 'border-red-300 shadow-red-50' : 'border-gray-200'} rounded-xl group-focus-within/input:border-red-500/40 group-focus-within/input:shadow-md transition-all px-4 shadow-sm`}>
        {prefix && (
          <div className="pr-3 flex items-center gap-1.5 border-r border-gray-100 text-[11px] font-black text-gray-400">
            {prefix}
          </div>
        )}
        {Icon && <Icon className={`w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors ${prefix ? 'ml-3' : ''}`} />}
        <input
          {...props}
          className="flex-1 h-full bg-transparent border-none focus:ring-0 text-[13px] font-bold text-gray-800 placeholder:text-gray-300 placeholder:font-medium outline-none ml-2"
        />
      </div>
    </div>
  </div>
)

export const FormSelect = ({
  label,
  required,
  options,
  icon: Icon,
  error,
  loading,
  emptyHint,
  disabled,
  ...props
}: any) => (
  <div className="space-y-1.5 group">
    <div className="flex items-center justify-between">
      <label className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 group-focus-within:text-red-600 transition-colors">
        {label} {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>
      {loading && (
        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter animate-pulse">
          Loading…
        </span>
      )}
      {error && !loading && (
        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">{error}</span>
      )}
    </div>
    <div className="relative group/input">
      <div className="absolute inset-0 bg-red-600/0 border border-transparent rounded-xl transition-all group-focus-within/input:border-red-500/20 group-focus-within/input:ring-4 group-focus-within/input:ring-red-100/30" />
      <div
        className={`relative flex items-center h-12 bg-white border ${
          error ? 'border-red-300 shadow-red-50' : 'border-gray-200'
        } ${disabled ? 'opacity-60 bg-slate-50' : ''} rounded-xl group-focus-within/input:border-red-500/40 group-focus-within/input:shadow-md transition-all px-4 shadow-sm`}
      >
        {Icon && (
          <Icon className="w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors shrink-0" />
        )}
        <select
          {...props}
          disabled={disabled || loading}
          className={`flex-1 h-full min-w-0 ${Icon ? 'px-3' : 'px-0'} bg-transparent border-none focus:ring-0 text-[13px] font-bold text-gray-800 cursor-pointer appearance-none outline-none disabled:cursor-not-allowed`}
        >
          <option value="">
            {loading ? `Loading ${label}…` : emptyHint || `Select ${label}`}
          </option>
          {options?.map((opt: any) => (
            <option key={opt.id} value={opt.id}>
              {opt.name || opt.ambulanceNumber || opt.label}
              {opt.plateNumber ? ` · ${opt.plateNumber}` : ''}
              {opt.address ? ` · ${opt.address}` : ''}
            </option>
          ))}
        </select>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 rotate-90 ml-2 shrink-0" />
      </div>
    </div>
  </div>
)

export const FormCheckbox = ({ label, checked, onChange, description }: any) => (
  <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
    <div className="relative mt-0.5">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange}
        className="w-5 h-5 rounded-md border-2 border-gray-200 text-red-600 focus:ring-4 focus:ring-red-100 transition-all cursor-pointer" 
      />
    </div>
    <div className="flex-1">
      <p className="text-[11px] font-black text-gray-900 uppercase tracking-wider group-hover:text-red-600 transition-colors">{label}</p>
      {description && <p className="text-[10px] text-gray-400 font-bold tracking-tight mt-0.5">{description}</p>}
    </div>
  </label>
)

export const FileUploadCard = ({ label, icon: Icon, value, onChange, accept = "*/*", description }: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      setIsUploading(true)
      const res = await uploadService.uploadFile(file)
      onChange(res.url)
      toast.success(`${label} uploaded`)
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Upload failed'
      toast.error(Array.isArray(message) ? message.join(', ') : message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center
          ${value ? 'border-red-500 bg-red-50/30' : 'border-red-100 bg-red-50/20 hover:border-red-400 hover:bg-red-50/40'}
        `}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        ) : value ? (
          <div className="space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Document Attached</p>
            <p className="text-[9px] text-gray-400 truncate max-w-[150px]">{value.split('/').pop()}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="p-3 rounded-full bg-white shadow-sm border border-gray-100 mx-auto w-fit">
              <Icon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{description || 'Click to upload files'}</p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">PDF, JPG, PNG up to 10MB</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleUpload} />
      </div>
    </div>
  )
}
