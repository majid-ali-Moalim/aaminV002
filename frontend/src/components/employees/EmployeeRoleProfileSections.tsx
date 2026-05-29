'use client'

import {
  Truck,
  Stethoscope,
  Heart,
  Activity,
  Shield,
  Syringe,
  Thermometer,
  Package,
  CheckCircle2,
  XCircle,
  Fuel,
  Gauge,
  MapPin,
  Wrench,
  GraduationCap,
  FileText,
  AlertCircle,
  Radio,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Ambulance, Employee } from '@/types'
import { profilePhotoUrl } from '@/lib/profilePhoto'

export type ProfileEmployee = Employee & {
  alternatePhone?: string | null
  qualification?: string | null
  specialization?: string | null
  bloodGroup?: string | null
  yearsOfExperience?: number | null
  emergencyCareTrained?: boolean | null
  medicalClearanceStatus?: string | null
  certificationUpload?: string | null
}

export function isNurseRole(roleName?: string | null) {
  return (roleName?.toUpperCase() || '').includes('NURSE')
}

export function isDriverRole(roleName?: string | null) {
  return (roleName?.toUpperCase() || '').includes('DRIVER')
}

export function isDispatcherRole(roleName?: string | null) {
  return (roleName?.toUpperCase() || '').includes('DISPATCH')
}

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function EquipmentChip({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon
  label: string
  active: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2.5 p-3 rounded-xl border ${
        active
          ? 'bg-white border-red-100 shadow-sm'
          : 'bg-slate-50 border-slate-100 opacity-50'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          active ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {active ? 'Equipped' : 'Not issued'}
        </p>
      </div>
      {active ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
      )}
    </div>
  )
}

export function DriverAmbulanceSection({ ambulance }: { ambulance?: Ambulance | null }) {
  if (!ambulance) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-3 text-3xl">
          🚑
        </div>
        <p className="font-black text-slate-700">No ambulance assigned</p>
        <p className="text-sm text-slate-500 mt-1">Assign a vehicle from the driver registration form.</p>
      </div>
    )
  }

  const statusColor =
    ambulance.status === 'AVAILABLE' || ambulance.status === 'ON_DUTY'
      ? 'bg-green-100 text-green-800'
      : 'bg-amber-100 text-amber-800'

  return (
    <div className="rounded-2xl overflow-hidden border border-orange-200 shadow-sm">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-white flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl shrink-0">
          🚑
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-100">Assigned Ambulance</p>
          <p className="text-xl font-black truncate">{ambulance.ambulanceNumber}</p>
          <p className="text-sm text-orange-100 font-medium truncate">
            {[ambulance.vehicleBrand, ambulance.vehicleModel].filter(Boolean).join(' ') || ambulance.plateNumber}
          </p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${statusColor}`}>
          {String(ambulance.status).replace(/_/g, ' ')}
        </span>
      </div>
      <div className="p-4 bg-gradient-to-b from-orange-50/80 to-white grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatPill icon={Truck} label="Plate" value={ambulance.plateNumber} />
        <StatPill icon={Package} label="Type" value={ambulance.vehicleType} />
        <StatPill icon={Shield} label="Equipment Level" value={ambulance.equipmentLevel?.name} />
        <StatPill icon={Fuel} label="Fuel" value={ambulance.fuelLevel != null ? `${ambulance.fuelLevel}%` : null} />
        <StatPill icon={Gauge} label="Mileage" value={ambulance.mileage != null ? `${ambulance.mileage} km` : null} />
        <StatPill icon={MapPin} label="Location" value={ambulance.location || ambulance.station?.name} />
        <StatPill icon={Wrench} label="Last Service" value={formatDate(ambulance.lastMaintenance)} />
        <StatPill icon={Wrench} label="Next Service" value={formatDate(ambulance.nextMaintenance)} />
        <StatPill icon={Activity} label="Crew Capacity" value={ambulance.crewCount ? `${ambulance.crewCount} crew` : null} />
      </div>
      {ambulance.notes && (
        <div className="px-4 pb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Notes</p>
          <p className="text-sm text-slate-600 font-medium">{ambulance.notes}</p>
        </div>
      )}
    </div>
  )
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value?: string | null
}) {
  if (!value?.trim()) return null
  return (
    <div className="p-3 rounded-xl bg-white border border-orange-100">
      <div className="flex items-center gap-1.5 text-orange-600 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
    </div>
  )
}

const NURSE_KIT_ITEMS: { icon: LucideIcon; label: string; when?: (e: ProfileEmployee) => boolean }[] = [
  { icon: Stethoscope, label: 'Stethoscope' },
  { icon: Thermometer, label: 'Digital Thermometer' },
  { icon: Heart, label: 'Blood Pressure Cuff' },
  { icon: Shield, label: 'PPE & Gloves Kit' },
  { icon: Syringe, label: 'IV & Cannulation Supplies' },
  { icon: Activity, label: 'Advanced Trauma Kit', when: (e) => Boolean(e.emergencyCareTrained) },
  { icon: Package, label: 'Emergency Medications Pack', when: (e) => Boolean(e.emergencyCareTrained) },
  { icon: Heart, label: 'Portable Oxygen Setup', when: (e) => Boolean(e.emergencyCareTrained) },
]

export function NurseEquipmentSection({ employee }: { employee: ProfileEmployee }) {
  const certUrl = profilePhotoUrl(employee.certificationUpload)
  const clearance = employee.medicalClearanceStatus || 'PENDING'
  const clearanceClass =
    clearance === 'CLEARED' || clearance === 'APPROVED'
      ? 'bg-green-100 text-green-800 border-green-200'
      : clearance === 'PENDING'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-red-200 shadow-sm">
        <div className="bg-gradient-to-r from-rose-600 to-red-500 px-5 py-4 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-100">Nursing Equipment</p>
            <p className="text-lg font-black truncate">
              {employee.qualification || 'Clinical Staff Kit'}
            </p>
            <p className="text-sm text-red-100 truncate">
              {employee.specialization || 'General nursing'} · {employee.yearsOfExperience ?? 0} yrs experience
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${clearanceClass}`}>
            {clearance}
          </span>
        </div>

        <div className="p-4 bg-gradient-to-b from-red-50/60 to-white">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3">Issued clinical kit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {NURSE_KIT_ITEMS.map((item) => {
              const active = item.when ? item.when(employee) : true
              return <EquipmentChip key={item.label} icon={item.icon} label={item.label} active={active} />
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {employee.licenseNumber && (
          <div className="p-4 rounded-xl bg-white border border-red-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nursing License</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{employee.licenseNumber}</p>
            {employee.licenseExpiryDate && (
              <p className="text-xs text-slate-500 mt-0.5">Expires {formatDate(employee.licenseExpiryDate)}</p>
            )}
          </div>
        )}
        {employee.emergencyCareTrained && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-800 uppercase">Emergency Care Certified</p>
              <p className="text-sm text-red-700/80 mt-0.5">Authorized for advanced pre-hospital care.</p>
            </div>
          </div>
        )}
        {employee.assignedAmbulance?.equipmentLevel?.name && (
          <div className="p-4 rounded-xl bg-white border border-red-100 sm:col-span-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Unit Equipment Tier</p>
            <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-2">
              <Truck className="w-4 h-4 text-red-500" />
              {employee.assignedAmbulance.ambulanceNumber} · {employee.assignedAmbulance.equipmentLevel.name}
            </p>
          </div>
        )}
        {certUrl && (
          <a
            href={certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-white border border-red-100 hover:border-red-300 transition-colors flex items-center gap-3 sm:col-span-2"
          >
            <FileText className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-xs font-black text-slate-800">View certification document</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">PDF / Image upload</p>
            </div>
          </a>
        )}
        {!employee.emergencyCareTrained && !certUrl && !employee.licenseNumber && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 sm:col-span-2">
            <GraduationCap className="w-5 h-5 text-slate-400" />
            <p className="text-sm text-slate-600">Standard nursing kit issued per department protocol.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function DispatcherCredentialsSection({ employee }: { employee: ProfileEmployee }) {
  const certUrl = profilePhotoUrl(employee.certificationUpload)
  const licenseStatus = employee.licenseStatus || 'VALID'
  const licenseClass =
    licenseStatus === 'VALID' || licenseStatus === 'CLEARED'
      ? 'bg-green-100 text-green-800 border-green-200'
      : licenseStatus === 'EXPIRING' || licenseStatus === 'PENDING'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-red-200 shadow-sm">
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Radio className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-100">Dispatch Credentials</p>
            <p className="text-lg font-black truncate">{employee.qualification || 'Command Center Staff'}</p>
            <p className="text-sm text-red-100 truncate">
              {employee.licenseNumber || 'No cert ID'} · {employee.yearsOfExperience ?? 0} yrs experience
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${licenseClass}`}>
            {licenseStatus}
          </span>
        </div>

        <div className="p-4 bg-gradient-to-b from-red-50/60 to-white grid grid-cols-1 sm:grid-cols-2 gap-3">
          {employee.licenseNumber && (
            <div className="p-4 rounded-xl bg-white border border-red-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certification ID</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{employee.licenseNumber}</p>
              {employee.licenseExpiryDate && (
                <p className="text-xs text-slate-500 mt-0.5">Expires {formatDate(employee.licenseExpiryDate)}</p>
              )}
            </div>
          )}
          {employee.licenseType && (
            <div className="p-4 rounded-xl bg-white border border-red-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">License Type</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{employee.licenseType}</p>
            </div>
          )}
          {certUrl && (
            <a
              href={certUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-white border border-red-100 hover:border-red-300 transition-colors flex items-center gap-3 sm:col-span-2"
            >
              <FileText className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs font-black text-slate-800">View dispatch certificate</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">PDF / Image upload</p>
              </div>
            </a>
          )}
          {!employee.licenseNumber && !certUrl && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 sm:col-span-2">
              <GraduationCap className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-600">No certification documents on file yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
