'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MapPin, Navigation, Share2, Copy, ExternalLink } from 'lucide-react'
import {
  copyPickupGpsLink,
  formatPickupCoords,
  googleMapsUrl,
  resolvePickupGps,
  type PickupGpsFields,
} from '@/lib/pickupGps'

type Props = {
  request: PickupGpsFields
  /** compact = inline bar; full = card with map embed link */
  variant?: 'compact' | 'full'
  title?: string
  tone?: 'light' | 'dark'
}

export default function PickupGpsPanel({ request, variant = 'full', title, tone = 'light' }: Props) {
  const [sharing, setSharing] = useState(false)

  const coordsResolved = resolvePickupGps(request)
  if (!coordsResolved) return null

  const { lat, lng } = coordsResolved
  const mapsUrl = googleMapsUrl(lat, lng)
  const coords = formatPickupCoords(lat, lng)

  const handleCopy = async () => {
    try {
      await copyPickupGpsLink(lat, lng)
      toast.success('GPS link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Patient pickup GPS',
          text: `Exact pickup: ${coords}`,
          url: mapsUrl,
        })
      } else {
        await copyPickupGpsLink(lat, lng)
        toast.success('Link copied — share with driver')
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        toast.error('Could not share location')
      }
    } finally {
      setSharing(false)
    }
  }

  if (variant === 'compact') {
    const chipClass =
      tone === 'dark'
        ? 'text-green-400 bg-green-950/50 border-green-800'
        : 'text-green-700 bg-green-50 border-green-200'
    const linkClass =
      tone === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'

    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-lg border ${chipClass}`}>
          <MapPin className="w-3.5 h-3.5" />
          GPS {coords}
        </span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-bold ${linkClass}`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Navigate
        </a>
      </div>
    )
  }

  const cardClass =
    tone === 'dark'
      ? 'rounded-2xl border-2 border-green-800/60 bg-gradient-to-br from-green-950/40 to-zinc-900 p-5 space-y-4'
      : 'rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50 p-5 space-y-4'
  const titleClass = tone === 'dark' ? 'text-green-400' : 'text-green-800'
  const coordsClass = tone === 'dark' ? 'text-zinc-100' : 'text-slate-800'
  const descClass = tone === 'dark' ? 'text-zinc-400' : 'text-slate-600'

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-black uppercase tracking-wider ${titleClass}`}>
            {title || 'Exact GPS pickup (patient shared)'}
          </p>
          <p className={`text-sm font-mono font-bold mt-1 ${coordsClass}`}>{coords}</p>
          <p className={`text-xs mt-1 ${descClass}`}>
            {tone === 'dark'
              ? 'Navigate to this pin — shared by dispatch from the patient request.'
              : 'Use this pin for dispatch and share with the assigned driver for navigation.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition"
        >
          <Navigation className="w-4 h-4" />
          Open in Maps
        </a>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition disabled:opacity-60"
        >
          <Share2 className="w-4 h-4" />
          Share with driver
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-green-300 text-green-800 text-sm font-bold hover:bg-white transition"
        >
          <Copy className="w-4 h-4" />
          Copy link
        </button>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-white transition"
        >
          <ExternalLink className="w-4 h-4" />
          Google Maps
        </a>
      </div>

      <iframe
        title="Pickup location map"
        className={`w-full h-40 rounded-xl border bg-white ${tone === 'dark' ? 'border-green-900' : 'border-green-200'}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
      />
    </div>
  )
}
