'use client'

import Link from 'next/link'
import { Facebook, Instagram, Mail, Youtube } from 'lucide-react'

const SOCIAL_LINKS = [
  {
    href: 'https://www.facebook.com/AaminAmbulance/',
    label: 'Facebook',
    icon: Facebook,
  },
  {
    href: 'https://x.com/aaminambulance',
    label: 'X (Twitter)',
    icon: XIcon,
  },
  {
    href: 'https://www.youtube.com/channel/UCl_TEl6JhUveFRHoeQXPa_A',
    label: 'YouTube',
    icon: Youtube,
  },
  {
    href: 'mailto:info@aaminambulance.com',
    label: 'Email',
    icon: Mail,
  },
  {
    href: 'https://www.instagram.com/aaminambulance/',
    label: 'Instagram',
    icon: Instagram,
  },
] as const

const TICKER_ITEMS = [
  { key: 'phone', content: <>Call us today! +252619520460</> },
  { key: 'hotline', content: <>Hotline: 999 | 3800</> },
  {
    key: 'email',
    content: (
      <a href="mailto:info@aaminambulance.com" className="hover:underline">
        info@aaminambulance.com
      </a>
    ),
  },
  {
    key: 'whistle',
    content: (
      <>
        Whistleblowing Email:{' '}
        <a href="mailto:complaint@aamin.so" className="hover:underline">
          complaint@aamin.so
        </a>
      </>
    ),
  },
] as const

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TickerTrack() {
  return (
    <div className="flex items-center gap-8 px-4 font-semibold leading-relaxed shrink-0">
      {TICKER_ITEMS.map((item, index) => (
        <span key={item.key} className="inline-flex items-center gap-8">
          {index > 0 && <span className="text-white/40">|</span>}
          {item.content}
        </span>
      ))}
    </div>
  )
}

export default function AuthPortalTopBar() {
  return (
    <div className="bg-[#941e1e] text-white text-[11px] sm:text-xs site-top-bar-enter overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1 min-w-0 overflow-hidden py-2.5">
          <div className="site-header-marquee flex w-max">
            <TickerTrack />
            <TickerTrack />
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 shrink-0 px-4 border-l border-white/20">
          {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-white/90 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>

      <div className="flex lg:hidden items-center justify-center gap-2.5 pb-2 border-t border-white/10 pt-2">
        {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={`mobile-${href}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-white/90 hover:text-white transition-colors"
          >
            <Icon className="w-4 h-4" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AuthPortalFooter() {
  const year = new Date().getFullYear()
  return (
    <div className="mt-8 text-center px-4">
      <p className="text-xs text-gray-500">
        © {year} Aamin Ambulance. All rights reserved.
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Secure authentication portal for authorized personnel only.
      </p>
    </div>
  )
}
