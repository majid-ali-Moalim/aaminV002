'use client'

import Image from 'next/image'

type LogoSize = 'sidebar' | 'auth' | 'sm' | 'md'

const LOGO_WIDTH: Record<LogoSize, number> = {
  sidebar: 112,
  auth: 150,
  sm: 96,
  md: 128,
}

type Props = {
  size?: LogoSize
  /** Override width in pixels when needed */
  width?: number
  className?: string
  /** White backing for dark sidebars / headers */
  onDark?: boolean
  priority?: boolean
}

const LOGO_SRC = '/images/aamin-ambulance-logo.png'

export default function AaminLogo({
  size = 'md',
  width,
  className = '',
  onDark = false,
  priority = false,
}: Props) {
  const w = width ?? LOGO_WIDTH[size]
  const height = Math.round(w * 0.35)
  const heightClass = size === 'auth' ? 'h-10' : size === 'sm' ? 'h-7' : 'h-8'

  const img = (
    <Image
      src={LOGO_SRC}
      alt="Aamin Ambulance"
      width={w}
      height={height}
      className={`block w-auto max-w-full object-contain ${heightClass} ${className}`}
      priority={priority}
      unoptimized
    />
  )

  if (onDark) {
    return (
      <div className="bg-white rounded-md px-2 py-1 shadow-sm inline-flex items-center justify-center max-w-full">
        {img}
      </div>
    )
  }

  return img
}
