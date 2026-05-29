import React from 'react'
import {
  User, Phone, Mail, MapPin, CreditCard,
  Stethoscope, GraduationCap, Briefcase, Award,
  ShieldCheck, Lock, UserCircle, Clock,
  Upload, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react'
import { uploadService } from '@/lib/api'
import { toast } from 'react-hot-toast'

// --- Reusable Input Components (Aamin Red & White Theme) ---

export const SectionHeader = ({ icon: Icon, title, subtitle, color = 'red' }: any) => {
  const colorMap: any = {
    red: 'bg-red-600 shadow-red-900/20',
    slate: 'bg-slate-700 shadow-slate-900/20',
    green: 'bg-green-600 shadow-green-900/20',
  }
  return (
    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100/50">
      <div className={`p-2.5 rounded-xl text-white shadow-lg ${colorMap[color] || colorMap.red}`}>
        <Icon className="w-5 h-5 stroke-[2.5]" />
      </div>
      <div>
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{title}</h3>
        {subtitle && (
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export const TacticalBadge = ({ label, color = 'red', icon: Icon }: any) => {
  const colorMap: any = {
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  }
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colorMap[color] || colorMap.red}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </div>
  )
}

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
      <div
        className={`relative flex items-center h-12 bg-white border ${error ? 'border-red-300 shadow-red-50' : 'border-gray-200'} rounded-xl group-focus-within/input:border-red-500/40 group-focus-within/input:shadow-md transition-all px-4 shadow-sm`}
      >
        {prefix && (
          <div className="pr-3 flex items-center gap-1.5 border-r border-gray-100 text-[11px] font-black text-gray-400">
            {prefix}
          </div>
        )}
        {Icon && (
          <Icon className={`w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors ${prefix ? 'ml-3' : ''}`} />
        )}
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
      {loading && <span className="text-[9px] font-bold text-red-500 uppercase animate-pulse">Loading…</span>}
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
        {Icon && <Icon className="w-4 h-4 text-gray-300 group-focus-within:text-red-500 transition-colors shrink-0" />}
        <select
          {...props}
          disabled={disabled || loading}
          className={`flex-1 h-full min-w-0 ${Icon ? 'px-3' : 'px-0'} bg-transparent border-none focus:ring-0 text-[13px] font-bold text-gray-800 cursor-pointer appearance-none outline-none disabled:cursor-not-allowed`}
        >
          <option value="">
            {loading ? `Loading ${label}…` : emptyHint || `Select ${label}`}
          </option>
          {options?.map((opt: any) => (
            <option key={opt.id || opt} value={opt.id || opt}>
              {opt.name || opt.ambulanceNumber || opt.label || opt}
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

export const FormCheckbox = ({ label, description, checked, onChange }: any) => (
  <label className="flex items-start gap-3 p-4 rounded-xl border border-red-100 bg-red-50/30 cursor-pointer hover:bg-red-50 transition">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
    />
    <div>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  </label>
)

const FileUploadField = ({ label, value, onChange, accept = 'image/*', icon: Icon, description }: any) => {
  const [isUploading, setIsUploading] = React.useState(false)
  const [localPreview, setLocalPreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) setLocalPreview(URL.createObjectURL(file))
    try {
      setIsUploading(true)
      const res = await uploadService.uploadFile(file)
      onChange(res.url)
      toast.success(`${label} uploaded`)
    } catch {
      toast.error('Upload failed')
      setLocalPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const displayUrl = localPreview || (value?.startsWith('/uploads') ? `http://localhost:3001${value}` : value)

  return (
    <div className="space-y-1.5 group">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      {description && <p className="text-[10px] text-slate-500">{description}</p>}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative h-24 border-2 border-dashed border-red-100 rounded-xl bg-red-50/30 hover:border-red-400 hover:bg-red-50/50 transition-all cursor-pointer overflow-hidden"
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            {isUploading ? (
              <span className="text-[10px] font-bold text-red-600">Uploading…</span>
            ) : (
              <>
                <Upload className="w-4 h-4 text-gray-400 mb-1" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Upload file</span>
              </>
            )}
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleFileChange} />
      </div>
    </div>
  )
}

export const FileUploadCard = ({ label, icon: Icon, value, onChange, accept = '*/*', description }: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setIsUploading(true)
      const res = await uploadService.uploadFile(file)
      onChange(res.url)
      toast.success(`${label} uploaded`)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Upload failed'
      toast.error(Array.isArray(message) ? message.join(', ') : message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      {description && <p className="text-[10px] text-slate-500">{description}</p>}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center
          ${value ? 'border-red-500 bg-red-50/30' : 'border-red-100 bg-red-50/20 hover:border-red-400 hover:bg-red-50/40'}
        `}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        ) : value ? (
          <div className="space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Document Attached</p>
            <p className="text-[9px] text-gray-400 truncate max-w-[150px]">{value.split('/').pop()}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Icon && <Icon className="w-8 h-8 text-red-300 mx-auto" />}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click to upload</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept={accept} onChange={handleUpload} />
      </div>
    </div>
  )
}

// --- Legacy section blocks (used by older flows) ---

export const PersonalInfoSection = ({ formData, setFormData }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput label="First Name" required icon={User} value={formData.firstName} onChange={(e: any) => setFormData({ ...formData, firstName: e.target.value })} />
        <FormInput label="Last Name" required icon={User} value={formData.lastName} onChange={(e: any) => setFormData({ ...formData, lastName: e.target.value })} />
        <FormSelect label="Gender" required options={['MALE', 'FEMALE']} value={formData.gender} onChange={(e: any) => setFormData({ ...formData, gender: e.target.value })} />
        <FormInput label="Date of Birth" required type="date" value={formData.dateOfBirth} onChange={(e: any) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
        <FormInput label="National ID" icon={CreditCard} value={formData.nationalId} onChange={(e: any) => setFormData({ ...formData, nationalId: e.target.value })} />
        <FormInput label="Address" icon={MapPin} value={formData.address} onChange={(e: any) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="md:col-span-1">
        <FileUploadField label="Profile Photo" value={formData.profilePhoto} onChange={(url: string) => setFormData({ ...formData, profilePhoto: url })} />
      </div>
    </div>
  </div>
)

export const ContactEmergencySection = ({ formData, setFormData }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="md:col-span-2 space-y-6">
      <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4">Primary Contact</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput label="Phone Number" required prefix="+252" icon={Phone} value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} />
        <FormInput label="Alternate Phone" prefix="+252" icon={Phone} value={formData.alternatePhone} onChange={(e: any) => setFormData({ ...formData, alternatePhone: e.target.value })} />
        <div className="md:col-span-2">
          <FormInput label="Email Address" required icon={Mail} value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
        </div>
      </div>
    </div>
    <div className="space-y-6">
      <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4">Emergency</h3>
      <FormInput label="Contact Name" required icon={User} value={formData.emergencyContactName} onChange={(e: any) => setFormData({ ...formData, emergencyContactName: e.target.value })} />
      <FormInput label="Relationship" value={formData.relationship} onChange={(e: any) => setFormData({ ...formData, relationship: e.target.value })} />
      <FormInput label="Contact Phone" required prefix="+252" icon={Phone} value={formData.emergencyPhone} onChange={(e: any) => setFormData({ ...formData, emergencyPhone: e.target.value })} />
    </div>
  </div>
)

export const ProfessionalSection = ({ formData, setFormData }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormInput label="License Number" required icon={Award} value={formData.licenseNumber} onChange={(e: any) => setFormData({ ...formData, licenseNumber: e.target.value })} />
      <FormInput label="License Expiry" required type="date" value={formData.licenseExpiryDate} onChange={(e: any) => setFormData({ ...formData, licenseExpiryDate: e.target.value })} />
      <FormSelect label="Qualification" required options={['Diploma in Nursing', 'BSc Nursing', 'MSc Nursing', 'Specialist Nurse']} value={formData.qualification} onChange={(e: any) => setFormData({ ...formData, qualification: e.target.value })} />
      <FormSelect label="Specialization" required options={['Emergency', 'ICU', 'Trauma', 'General']} value={formData.specialization} onChange={(e: any) => setFormData({ ...formData, specialization: e.target.value })} />
      <FormInput label="Years of Experience" type="number" icon={Briefcase} value={formData.yearsOfExperience} onChange={(e: any) => setFormData({ ...formData, yearsOfExperience: e.target.value })} />
      <FormSelect label="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} value={formData.bloodGroup} onChange={(e: any) => setFormData({ ...formData, bloodGroup: e.target.value })} />
    </div>
    <div className="md:col-span-1">
      <FileUploadField label="Certification Upload (PDF/Image)" accept="image/*,application/pdf" value={formData.certificationUpload} onChange={(url: string) => setFormData({ ...formData, certificationUpload: url })} />
      <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <p className="text-[10px] text-red-600 font-bold leading-tight">Must include valid registration with the Ministry of Health.</p>
      </div>
    </div>
  </div>
)

export const AccountAccessSection = ({ formData, setFormData }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="space-y-6">
      <FormInput label="Username / System ID" required icon={UserCircle} value={formData.username} onChange={(e: any) => setFormData({ ...formData, username: e.target.value })} />
      <FormInput label="Password" required type="password" icon={Lock} value={formData.password} onChange={(e: any) => setFormData({ ...formData, password: e.target.value })} />
      <FormInput label="Confirm Password" required type="password" icon={Lock} />
    </div>
    <div className="p-8 bg-gray-50/50 rounded-3xl border border-gray-100 flex flex-col justify-center">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Security Clearance</h4>
          <p className="text-[10px] text-gray-400 font-bold">Standard clinical staff permissions</p>
        </div>
      </div>
      <ul className="space-y-2 mt-4">
        {['Access to medical reports', 'Incident dispatch visibility', 'Patient records management'].map((item) => (
          <li key={item} className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
            <CheckCircle2 className="w-3 h-3 text-green-500" /> {item}
          </li>
        ))}
      </ul>
    </div>
  </div>
)

export const ShiftSection = ({ formData, setFormData, stations }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="space-y-6">
      <FormSelect label="Assigned Station" required options={stations} value={formData.stationId} onChange={(e: any) => setFormData({ ...formData, stationId: e.target.value })} />
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Working Days</label>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
            const isSelected = formData.workDays?.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const current = formData.workDays || ''
                  const next = current.includes(day)
                    ? current.split(',').filter((d: string) => d !== day).join(',')
                    : [...current.split(',').filter(Boolean), day].join(',')
                  setFormData({ ...formData, workDays: next })
                }}
                className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${isSelected ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-300 border-gray-100 hover:border-red-200'}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-6">
      <FormSelect label="Primary Shift" options={['Morning Shift', 'Afternoon Shift', 'Night Shift', 'Rotational']} value={formData.defaultShift} onChange={(e: any) => setFormData({ ...formData, defaultShift: e.target.value })} />
      <FormInput label="Backup / Emergency Shift" placeholder="Optional" icon={Clock} value={formData.backupShift} onChange={(e: any) => setFormData({ ...formData, backupShift: e.target.value })} />
    </div>
  </div>
)
