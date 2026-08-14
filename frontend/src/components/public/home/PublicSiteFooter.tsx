import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import AaminLogo from '@/components/brand/AaminLogo'
import { AAMIN_CONTACT } from './homeContent'

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/#how-it-works', label: 'How We Work' },
  { href: '/#services', label: 'Ambulance Services' },
  { href: '/#referral', label: 'Referral Management' },
  { href: '/#public-safety', label: 'Public Safety' },
  { href: '/contact', label: 'Contact Us' },
]

const SERVICE_LINKS = [
  'Emergency Medical Services',
  'Ambulance Services',
  'Public Safety',
  'Referral Management',
  'First Aid Training',
  'Clinical Services',
]

export default function PublicSiteFooter() {
  return (
    <footer className="bg-[#0B1220] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <AaminLogo size="md" onDark />
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              24-hour free ambulance and pre-hospital emergency medical service in Mogadishu, Somalia.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Services</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {SERVICE_LINKS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Emergency</h3>
              <a
                href={`tel:${AAMIN_CONTACT.emergencyTel}`}
                className="text-3xl font-black text-red-400 hover:text-red-300 transition-colors"
              >
                {AAMIN_CONTACT.emergencyDisplay}
              </a>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Contact</h3>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  {AAMIN_CONTACT.location}
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-red-400" />
                  <a href={`tel:${AAMIN_CONTACT.phoneTel}`} className="hover:text-white">
                    {AAMIN_CONTACT.phoneDisplay}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-red-400" />
                  <a href={`mailto:${AAMIN_CONTACT.emailPrimary}`} className="hover:text-white break-all">
                    {AAMIN_CONTACT.emailPrimary}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Aamin Ambulance. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
