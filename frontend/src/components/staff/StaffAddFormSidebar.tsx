'use client'

import { RefreshCw, UserPlus } from 'lucide-react'
import { TacticalBadge } from '@/components/nurses/NurseFormSections'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type StaffAddRole = 'dispatcher' | 'driver' | 'nurse'

const HELP_TEXT: Record<StaffAddRole, string> = {
  dispatcher:
    'Complete all steps to register a dispatcher with system login for the command center.',
  driver:
    'Complete all steps to register a driver with system login and optional ambulance assignment.',
  nurse:
    'Complete all steps to register a nurse with system login and optional ambulance assignment.',
}

function photoUrl(path?: string) {
  if (!path) return ''
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

export function StaffPhotoUploadBlock({
  role,
  displayName,
  employeeCode,
  profilePhoto,
  uploadingPhoto,
  onUpload,
  compact,
}: {
  role: StaffAddRole
  displayName: string
  employeeCode: string
  profilePhoto: string
  uploadingPhoto: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  compact?: boolean
}) {
  const inputId = compact ? `${role}-photo-upload-mobile` : `${role}-photo-upload`

  return (
    <div
      className={`flex ${compact ? 'flex-row items-center gap-4' : 'flex-col items-center'} p-5 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50`}
    >
      <label
        htmlFor={inputId}
        className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} rounded-2xl bg-white border-2 border-red-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-500 transition shrink-0`}
      >
        {uploadingPhoto ? (
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
        ) : profilePhoto ? (
          <img src={photoUrl(profilePhoto)} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserPlus className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} text-red-300`} />
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUpload}
        disabled={uploadingPhoto}
      />
      <div className={compact ? 'text-left flex-1 min-w-0' : 'text-center'}>
        <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
        <div className={`${compact ? 'mt-1' : 'mt-2 mb-1'}`}>
          <TacticalBadge label={employeeCode} color="red" />
        </div>
        {!compact && (
          <p className="text-[10px] text-slate-500 mt-2">Tap photo to upload profile image</p>
        )}
      </div>
    </div>
  )
}

export default function StaffAddFormSidebar({
  role,
  displayName,
  employeeCode,
  profilePhoto,
  uploadingPhoto,
  onUpload,
}: {
  role: StaffAddRole
  displayName: string
  employeeCode: string
  profilePhoto: string
  uploadingPhoto: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-red-100 p-6 shrink-0 overflow-y-auto">
      <StaffPhotoUploadBlock
        role={role}
        displayName={displayName}
        employeeCode={employeeCode}
        profilePhoto={profilePhoto}
        uploadingPhoto={uploadingPhoto}
        onUpload={onUpload}
      />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed mt-6">
        {HELP_TEXT[role]}
      </p>
    </aside>
  )
}
