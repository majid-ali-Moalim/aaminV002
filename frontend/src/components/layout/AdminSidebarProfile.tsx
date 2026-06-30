'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { profilePhotoUrl } from '@/lib/profilePhoto'

const SIDEBAR = {
  bg: '#0B1220',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
} as const

export default function AdminSidebarProfile() {
  const { user } = useAuth()
  const [photoError, setPhotoError] = useState(false)

  const firstName = user?.firstName || user?.employee?.firstName || ''
  const lastName = user?.lastName || user?.employee?.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.username || 'Admin User'
  const roleLabel = user?.employee?.employeeRole?.name || 'Administrator'
  const photoSrc = profilePhotoUrl(user?.employee?.profilePhoto)
  const showPhoto = Boolean(photoSrc) && !photoError
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    setPhotoError(false)
  }, [user?.employee?.profilePhoto])

  return (
    <Link
      href="/admin/profile"
      className="flex items-center gap-3 p-4 rounded-xl mx-2 mt-2 mb-1 transition-colors hover:bg-white/5"
      style={{ borderBottom: `1px solid ${SIDEBAR.border}` }}
    >
      <div
        className="w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-2 ring-red-600/80 shadow-lg shadow-red-950/30"
        style={{ backgroundColor: SIDEBAR.primary }}
      >
        {showPhoto ? (
          <img
            src={photoSrc}
            alt={fullName}
            className="w-full h-full object-cover"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-black text-white">
            {initials || <User className="w-5 h-5" />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white truncate leading-tight">{fullName}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 truncate mt-0.5">
          {roleLabel}
        </p>
      </div>
    </Link>
  )
}
