'use client'

import { useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Shield,
  Truck,
  Clock,
  User,
  CreditCard,
  Heart,
  Activity,
  Trash2,
  Stethoscope,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Employee, EmployeeRole } from '@/types'
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar'
import {
  DriverAmbulanceSection,
  NurseEquipmentSection,
  DispatcherCredentialsSection,
  isDriverRole,
  isNurseRole,
  isDispatcherRole,
  type ProfileEmployee,
} from '@/components/employees/EmployeeRoleProfileSections'

function getRoleTheme(roleName?: string | null) {
  const name = roleName?.toUpperCase() || ''
  if (name.includes('DRIVER')) return { gradient: 'from-orange-500 to-amber-500', chip: 'bg-orange-50 text-orange-700 border-orange-100' }
  if (name.includes('NURSE')) return { gradient: 'from-rose-600 to-red-500', chip: 'bg-red-50 text-red-700 border-red-100' }
  if (name.includes('DISPATCH')) return { gradient: 'from-red-600 to-red-500', chip: 'bg-red-50 text-red-700 border-red-100' }
  if (name.includes('ADMIN')) return { gradient: 'from-purple-500 to-violet-600', chip: 'bg-purple-50 text-purple-700 border-purple-100' }
  return { gradient: 'from-slate-500 to-slate-600', chip: 'bg-slate-50 text-slate-700 border-slate-100' }
}

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShiftStatus(status?: string | null) {
  if (!status) return '—'
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-slate-100 text-slate-700'
    case 'suspended':
      return 'bg-red-100 text-red-800'
    case 'on_leave':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value?: string | null
}) {
  const display = value?.trim()
  if (!display) return null
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-red-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5 break-words">{display}</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
      <span className="w-1.5 h-4 rounded-full bg-red-600" />
      {children}
    </h3>
  )
}

type ExtendedEmployee = ProfileEmployee

type Props = {
  employee: ExtendedEmployee | null
  open: boolean
  onClose: () => void
  availableRoles: EmployeeRole[]
  /** When opened from Nurses, Drivers, or Dispatchers list, force that role layout */
  profileVariant?: 'auto' | 'nurse' | 'driver' | 'dispatcher'
  onAssignRole: (employeeId: string, roleId: string) => void
  onUpdateStatus: (employeeId: string, status: string) => void
  onDelete: (employeeId: string) => void
  onEdit?: (employee: ExtendedEmployee) => void
}

export function EmployeeProfileModal({
  employee,
  open,
  onClose,
  availableRoles,
  profileVariant = 'auto',
  onAssignRole,
  onUpdateStatus,
  onDelete,
  onEdit,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !employee) return null

  const theme = getRoleTheme(employee.employeeRole?.name)
  const roleName = employee.employeeRole?.name
  const showNursePanel =
    profileVariant === 'nurse' || (profileVariant === 'auto' && isNurseRole(roleName))
  const showDriverPanel =
    profileVariant === 'driver' || (profileVariant === 'auto' && isDriverRole(roleName))
  const showDispatcherPanel =
    profileVariant === 'dispatcher' || (profileVariant === 'auto' && isDispatcherRole(roleName))
  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
  const stationLabel = employee.station
    ? [employee.station.name, employee.station.region?.name, employee.station.district?.name].filter(Boolean).join(' · ')
    : null
  const licenseExpiry = formatDate(employee.licenseExpiryDate)
  const employmentDate = formatDate(employee.employmentDate)
  const dateOfBirth = formatDate(employee.dateOfBirth)
  const registered = formatDate(employee.createdAt)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-profile-title"
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl shadow-red-900/10 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-[#C62828] via-[#D32F2F] to-[#E53935] px-6 pt-6 pb-16 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-100 mb-1">Staff Profile</p>
          <h2 id="employee-profile-title" className="text-xl font-black pr-12">
            {fullName}
          </h2>
          <p className="text-red-100 text-sm font-medium mt-1">
            {employee.employeeCode || 'No staff code'} · {employee.employeeRole?.name || 'Unassigned'}
          </p>
        </div>

        {/* Avatar overlap */}
        <div className="flex justify-center -mt-12 shrink-0 relative z-10 px-6">
          <EmployeeAvatar
            profilePhoto={employee.profilePhoto}
            firstName={employee.firstName}
            lastName={employee.lastName}
            gradient={theme.gradient}
            size="xl"
            className="ring-4 ring-white shadow-xl w-24 h-24 text-2xl rounded-[1.75rem]"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${theme.chip}`}>
              {employee.employeeRole?.name || 'Unassigned'}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(employee.status)}`}>
              {employee.status.replace(/_/g, ' ')}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
              {formatShiftStatus(employee.shiftStatus)}
            </span>
          </div>

          {showDriverPanel && (
            <div>
              <SectionTitle>Driver · Assigned Vehicle</SectionTitle>
              <DriverAmbulanceSection ambulance={employee.assignedAmbulance} />
            </div>
          )}

          {showNursePanel && (
            <div>
              <SectionTitle>Nurse · Clinical Equipment</SectionTitle>
              <NurseEquipmentSection employee={employee} />
            </div>
          )}

          {showDispatcherPanel && (
            <div>
              <SectionTitle>Dispatcher · Credentials</SectionTitle>
              <DispatcherCredentialsSection employee={employee} />
            </div>
          )}

          <div>
            <SectionTitle>Contact</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem icon={Mail} label="Email" value={employee.user?.email} />
              <InfoItem icon={Phone} label="Phone" value={employee.phone} />
              <InfoItem icon={Phone} label="Alternate Phone" value={employee.alternatePhone} />
              <InfoItem icon={User} label="Username" value={employee.user?.username} />
            </div>
          </div>

          <div>
            <SectionTitle>Employment</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem icon={CreditCard} label="Staff Code" value={employee.employeeCode} />
              <InfoItem icon={Building2} label="Department" value={employee.department?.name} />
              <InfoItem icon={Briefcase} label="System Access" value={employee.user?.role} />
              <InfoItem icon={Calendar} label="Employment Date" value={employmentDate} />
              <InfoItem icon={Clock} label="Default Shift" value={employee.defaultShift} />
              <InfoItem icon={Activity} label="Registered On" value={registered} />
            </div>
          </div>

          <div>
            <SectionTitle>Location</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem icon={MapPin} label="Station" value={stationLabel} />
              <InfoItem icon={MapPin} label="Address" value={employee.address} />
              {!showDriverPanel && !showNursePanel && !showDispatcherPanel && (
                <InfoItem
                  icon={Truck}
                  label="Assigned Ambulance"
                  value={
                    employee.assignedAmbulance
                      ? [employee.assignedAmbulance.ambulanceNumber, employee.assignedAmbulance.plateNumber]
                          .filter(Boolean)
                          .join(' · ')
                      : null
                  }
                />
              )}
            </div>
          </div>

          {!showNursePanel && !showDispatcherPanel && (employee.licenseNumber || licenseExpiry || employee.licenseType) && (
            <div>
              <SectionTitle>License & Credentials</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={Shield} label="License Number" value={employee.licenseNumber} />
                <InfoItem icon={Shield} label="License Type" value={employee.licenseType} />
                <InfoItem icon={Calendar} label="License Expiry" value={licenseExpiry} />
                <InfoItem icon={Activity} label="License Status" value={employee.licenseStatus} />
              </div>
            </div>
          )}

          {showDriverPanel && (employee.licenseNumber || licenseExpiry || employee.licenseClass) && (
            <div>
              <SectionTitle>Driving License</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={Shield} label="License Number" value={employee.licenseNumber} />
                <InfoItem icon={Shield} label="License Class" value={employee.licenseClass} />
                <InfoItem icon={Calendar} label="License Expiry" value={licenseExpiry} />
                <InfoItem icon={Activity} label="License Status" value={employee.licenseStatus} />
                <InfoItem icon={Heart} label="Medical Fitness" value={employee.medicalFitness} />
                <InfoItem icon={Calendar} label="Medical Expiry" value={formatDate(employee.medicalExpiry)} />
              </div>
            </div>
          )}

          {!showNursePanel && !showDispatcherPanel && !showDriverPanel && (employee.qualification || employee.specialization || employee.bloodGroup) && (
            <div>
              <SectionTitle>Clinical Profile</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={Stethoscope} label="Qualification" value={employee.qualification} />
                <InfoItem icon={Stethoscope} label="Specialization" value={employee.specialization} />
                <InfoItem icon={Heart} label="Blood Group" value={employee.bloodGroup} />
              </div>
            </div>
          )}

          {(employee.emergencyContactName || employee.emergencyPhone) && (
            <div>
              <SectionTitle>Emergency Contact</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={User} label="Contact Name" value={employee.emergencyContactName} />
                <InfoItem icon={Phone} label="Contact Phone" value={employee.emergencyPhone} />
                <InfoItem icon={Heart} label="Relationship" value={employee.relationship} />
              </div>
            </div>
          )}

          {(employee.nationalId || employee.gender || dateOfBirth) && (
            <div>
              <SectionTitle>Personal</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={CreditCard} label="National ID" value={employee.nationalId} />
                <InfoItem icon={User} label="Gender" value={employee.gender?.replace(/_/g, ' ')} />
                <InfoItem icon={Calendar} label="Date of Birth" value={dateOfBirth} />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className="h-11 rounded-xl px-3 bg-white border border-slate-200 text-sm font-bold text-slate-700"
              value={employee.employeeRoleId || ''}
              onChange={(e) => onAssignRole(employee.id, e.target.value)}
            >
              <option value="">Change role…</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              className="h-11 rounded-xl px-3 bg-white border border-slate-200 text-sm font-bold text-slate-700"
              value={employee.status}
              onChange={(e) => onUpdateStatus(employee.id, e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="flex gap-3">
            {onEdit && (
              <Button
                variant="outline"
                className="h-11 px-4 rounded-xl font-bold text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => onEdit(employee)}
              >
                Edit Profile
              </Button>
            )}
            <Button
              className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-sm"
              onClick={() =>
                onUpdateStatus(employee.id, employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
              }
            >
              {employee.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="outline"
              className="h-11 w-11 p-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => onDelete(employee.id)}
              aria-label="Delete employee"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="h-11 px-5 rounded-xl font-bold text-sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
