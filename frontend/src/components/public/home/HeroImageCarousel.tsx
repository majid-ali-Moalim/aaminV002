'use client'

import { useEffect, useState } from 'react'
import { Clock, HeartPulse } from 'lucide-react'

const HERO_SLIDES = [
  {
    src: '/images/hero/ambulance-services.png',
    title: 'Ambulance Services',
    caption: '24/7 emergency ambulance response',
  },
  {
    src: '/images/hero/aamin-ambulances.jpg',
    title: 'Aamin Ambulances',
    caption: 'A modern fleet ready to respond',
  },
  {
    src: '/images/hero/first-aid-training.jpg',
    title: 'First Aid Training',
    caption: 'Educating the community to save lives',
  },
  {
    src: '/images/hero/first-aid-venue.png',
    title: 'First Aid Training Venue',
    caption: 'Hands-on emergency care workshops',
  },
]

const ROTATE_MS = 4000

export default function HeroImageCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-200/50">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={i !== index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.title}
                className="h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            </div>
          ))}

          <div className="absolute left-0 right-0 top-4 flex justify-between px-4">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
              Pre-Hospital Emergency Care
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow">
              24/7
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-lg font-black text-white drop-shadow">{HERO_SLIDES[index].title}</p>
            <p className="mt-1 text-sm text-slate-200 drop-shadow">{HERO_SLIDES[index].caption}</p>
            <div className="mt-3 flex gap-1.5">
              {HERO_SLIDES.map((slide, i) => (
                <button
                  key={slide.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${slide.title}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-7 bg-red-500' : 'w-3 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <Clock className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-sm font-bold text-slate-900">24 Hours</p>
            <p className="mt-1 text-xs text-slate-500">Always available</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <HeartPulse className="mb-2 h-5 w-5 text-red-600" />
            <p className="text-sm font-bold text-slate-900">Free Service</p>
            <p className="mt-1 text-xs text-slate-500">Ambulance response</p>
          </div>
        </div>
      </div>
    </div>
  )
}
