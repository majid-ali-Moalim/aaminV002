'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { getEmployeeInitials, profilePhotoUrl } from '@/lib/profilePhoto'

type EmployeeAvatarProps = {
  profilePhoto?: string | null
  firstName?: string | null
  lastName?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  gradient?: string
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-10 h-10 text-sm rounded-xl',
  md: 'w-14 h-14 text-lg rounded-2xl',
  lg: 'w-24 h-24 text-2xl rounded-[2rem]',
  xl: 'w-32 h-32 text-3xl rounded-[2.5rem]',
}

export function EmployeeAvatar({
  profilePhoto,
  firstName,
  lastName,
  alt,
  size = 'md',
  gradient = 'from-slate-500 to-slate-600',
  className = '',
}: EmployeeAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const src = profilePhotoUrl(profilePhoto)
  const showPhoto = Boolean(src) && !imgError
  const initials = getEmployeeInitials(firstName, lastName)
  const name = alt || `${firstName || ''} ${lastName || ''}`.trim() || 'Employee'

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg ${SIZE_CLASSES[size]} ${className}`}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : initials !== '?' ? (
        initials
      ) : (
        <User className={size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-10 h-10'} />
      )}
    </div>
  )
}
