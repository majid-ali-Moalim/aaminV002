'use client'

import { Phone, Radio, MessageSquare, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const CHANNELS = [
  { icon: Radio, label: 'Contact Dispatch', desc: 'Open channel with dispatch operations', action: 'tel:+1911' },
  { icon: Phone, label: 'Call Patient', desc: 'Direct line when number is on file', action: '#' },
  { icon: MessageSquare, label: 'Team Chat', desc: 'Message driver and dispatch crew', href: '/nurse/communications' },
  { icon: AlertTriangle, label: 'Report Incident', desc: 'Safety or equipment incident', href: '/nurse/handover' },
]

export default function NurseCommunicationsView() {
  return (
    <div className="nurse-comm-grid">
      {CHANNELS.map((ch) => {
        const Icon = ch.icon
        const inner = (
          <>
            <div className="nurse-comm-icon">
              <Icon size={22} />
            </div>
            <h3>{ch.label}</h3>
            <p>{ch.desc}</p>
          </>
        )
        if (ch.href) {
          return (
            <Link key={ch.label} href={ch.href} className="nurse-comm-card">
              {inner}
            </Link>
          )
        }
        return (
          <a key={ch.label} href={ch.action} className="nurse-comm-card">
            {inner}
          </a>
        )
      })}

      <section className="nurse-form-card span-2">
        <h3 className="font-bold text-white mb-2">Quick message to dispatch</h3>
        <textarea rows={4} className="nurse-textarea" placeholder="Type update for dispatch (ETA, patient status, equipment need)…" />
        <button type="button" className="nurse-btn primary mt-3">
          Send Update
        </button>
      </section>
    </div>
  )
}
