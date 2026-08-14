import Link from 'next/link'
import {
  Truck,
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  HeartHandshake,
  HeartPulse,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  Siren,
  Stethoscope,
} from 'lucide-react'
import AaminLogo from '@/components/brand/AaminLogo'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import PublicSiteFooter from './PublicSiteFooter'
import StickyEmergencyCall from './StickyEmergencyCall'
import {
  AAMIN_CONTACT,
  HOME_SERVICES,
  HOME_STEPS,
  HOME_VALUES,
  HOME_WHY,
} from './homeContent'

const SERVICE_ICONS = {
  ambulance: Truck,
  ems: HeartPulse,
  shield: Shield,
  referral: HeartHandshake,
  training: BookOpen,
  clinical: Stethoscope,
} as const

function SectionHeading({
  eyebrow,
  title,
  description,
  light,
}: {
  eyebrow?: string
  title: string
  description?: string
  light?: boolean
}) {
  return (
    <div className="mx-auto max-w-3xl text-center mb-12 md:mb-14">
      {eyebrow ? (
        <p
          className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${
            light ? 'text-red-200' : 'text-red-600'
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-lg leading-relaxed ${light ? 'text-slate-300' : 'text-slate-600'}`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 hover:shadow-xl"
    >
      {children}
    </Link>
  )
}

function OutlineButton({
  href,
  children,
  external,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  const className =
    'inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900/10 bg-white px-7 py-4 text-base font-bold text-slate-900 transition hover:border-red-200 hover:bg-red-50'
  if (external) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export default function AaminHomePage() {
  return (
    <div className={`${PUBLIC_HEADER_OFFSET} pb-24 md:pb-0`}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-red-50/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <AaminLogo size="auth" priority />
              <div className="space-y-5">
                <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-black leading-[1.08] tracking-tight text-slate-900">
                  Emergency Medical Care When You Need It
                </h1>
                <p className="text-lg md:text-xl leading-relaxed text-slate-600 max-w-xl">
                  Aamin Ambulance provides free 24-hour ambulance and pre-hospital emergency medical services in
                  Mogadishu.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <PrimaryButton href="/hire-ambulance">
                  <Siren className="h-5 w-5" />
                  Request an Ambulance
                </PrimaryButton>
                <OutlineButton href={`tel:${AAMIN_CONTACT.emergencyTel}`} external>
                  <Phone className="h-5 w-5 text-red-600" />
                  Call {AAMIN_CONTACT.emergencyDisplay}
                </OutlineButton>
              </div>
              <div className="inline-flex items-center gap-4 rounded-2xl border border-red-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Emergency number</p>
                  <p className="text-2xl font-black text-red-600">{AAMIN_CONTACT.emergencyDisplay}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#0B1220] via-slate-800 to-red-900 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#ef4444,transparent_50%)]" />
                  <Truck className="h-20 w-20 text-red-400 mb-4 relative" strokeWidth={1.25} />
                  <p className="text-white font-bold text-lg relative">Pre-Hospital Emergency Care</p>
                  <p className="text-slate-300 text-sm mt-2 max-w-xs relative">
                    Professional ambulance response for urgent medical situations in Mogadishu
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <Clock className="h-5 w-5 text-red-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900">24 Hours</p>
                    <p className="text-xs text-slate-500 mt-1">Always available</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <HeartPulse className="h-5 w-5 text-red-600 mb-2" />
                    <p className="text-sm font-bold text-slate-900">Free Service</p>
                    <p className="text-xs text-slate-500 mt-1">Ambulance response</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency call */}
      <section className="bg-[#0B1220] py-14 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Need Emergency Help?</h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            If someone is seriously injured, suddenly ill, or facing a life-threatening emergency, request an ambulance
            or call {AAMIN_CONTACT.emergencyDisplay}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/hire-ambulance"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 py-4 text-base font-bold text-white hover:bg-red-500 transition"
            >
              Request an Ambulance
            </Link>
            <a
              href={`tel:${AAMIN_CONTACT.emergencyTel}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/20 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition"
            >
              Call {AAMIN_CONTACT.emergencyDisplay}
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-white scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 mb-3">About</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">
                About Aamin Ambulance
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Aamin Ambulance is a 24-hour, free ambulance service providing pre-hospital emergency medical care in
                Mogadishu, Somalia. Our services support people who need urgent medical assistance and safe
                transportation for emergency care.
              </p>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600 mb-2">Vision</p>
                <p className="text-slate-700 leading-relaxed">
                  To be the leading pre-hospital care provider in Somalia.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600 mb-2">Mission</p>
                <p className="text-slate-700 leading-relaxed">
                  To deliver top-quality pre-hospital services to improve the outcomes of affected people in Somalia
                  and beyond.
                </p>
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
              >
                Learn More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-slate-50 scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="What we provide"
            title="Our Services"
            description="Aamin Ambulance responds to emergencies including accidents, injuries, pregnancy-related complications, illnesses, explosions, and other urgent situations."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOME_SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.icon]
              return (
                <article
                  key={service.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-red-100"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{service.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{service.description}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* How to request */}
      <section id="how-it-works" className="py-20 bg-white scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Simple process"
            title="How to Request an Ambulance"
            description="A clear path from your request to emergency response — explained simply for anyone under stress."
          />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {HOME_STEPS.map((item, index) => (
              <div key={item.title} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                {index < HOME_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-red-200" />
                )}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <PrimaryButton href="/hire-ambulance">Start a Request</PrimaryButton>
          </div>
        </div>
      </section>

      {/* Why Aamin */}
      <section id="why-aamin" className="py-20 bg-slate-50 scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why choose us" title="Why Aamin Ambulance" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOME_WHY.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public safety */}
      <section id="public-safety" className="py-20 bg-white scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="rounded-[2rem] bg-gradient-to-br from-slate-100 to-red-50 p-8 md:p-10 flex items-center justify-center min-h-[280px]">
              <Shield className="h-24 w-24 text-red-600" strokeWidth={1.25} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 mb-3">Community</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">
                Emergency Preparedness and Public Safety
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Aamin Ambulance supports public awareness and emergency preparedness through activities such as
                emergency preparedness education, 9-9-9 awareness, career days, public information sessions, and
                community-focused programs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Referral */}
      <section id="referral" className="py-20 bg-slate-50 scroll-mt-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <Building2 className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-900 mb-4">Referral Management</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Aamin Ambulance supports healthcare providers that need ambulance services for patient referrals between
            healthcare facilities. Referral management helps maintain continuity of care and improves communication
            between healthcare providers involved in a patient&apos;s care.
          </p>
        </div>
      </section>

      {/* History */}
      <section id="history" className="py-20 bg-white scroll-mt-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4">Our Story</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Aamin Ambulance was founded by healthcare professionals and has developed its role in emergency response,
            pre-hospital care, community prevention, response, and recovery.
          </p>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="py-20 bg-[#0B1220] scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What guides us" title="Core Values" light />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOME_VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-6 backdrop-blur-sm"
              >
                <h3 className="font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-slate-50 scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Get in touch"
            title="Contact Aamin Ambulance"
            description={AAMIN_CONTACT.location}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Link
              href="/contact"
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-red-200 hover:shadow-md transition"
            >
              <Mail className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-slate-900">Contact Us</p>
              <p className="text-sm text-slate-500 mt-1">Send a message</p>
            </Link>
            <a
              href={`tel:${AAMIN_CONTACT.phoneTel}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-red-200 hover:shadow-md transition"
            >
              <Phone className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-slate-900">Call</p>
              <p className="text-sm text-slate-500 mt-1">{AAMIN_CONTACT.phoneDisplay}</p>
            </a>
            <a
              href={AAMIN_CONTACT.whatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-red-200 hover:shadow-md transition"
            >
              <MessageCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-slate-900">WhatsApp</p>
              <p className="text-sm text-slate-500 mt-1">{AAMIN_CONTACT.phoneDisplay}</p>
            </a>
            <a
              href={`mailto:${AAMIN_CONTACT.emailPrimary}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-red-200 hover:shadow-md transition"
            >
              <Mail className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-slate-900">Email</p>
              <p className="text-sm text-slate-500 mt-1 break-all">{AAMIN_CONTACT.emailPrimary}</p>
            </a>
          </div>
          <p className="text-center text-sm text-slate-500 mt-6">
            Also reach us at{' '}
            <a href={`mailto:${AAMIN_CONTACT.emailSecondary}`} className="text-red-600 font-semibold hover:underline">
              {AAMIN_CONTACT.emailSecondary}
            </a>
          </p>
        </div>
      </section>

      <PublicSiteFooter />
      <StickyEmergencyCall />
    </div>
  )
}
