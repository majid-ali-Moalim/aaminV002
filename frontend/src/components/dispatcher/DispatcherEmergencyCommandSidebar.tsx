'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Siren,
  HeartPulse,
  Warehouse,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  DISPATCHER_EMERGENCY_SECTIONS,
  DISPATCHER_PATIENTS_ITEMS,
  DISPATCHER_RESOURCES_ITEMS,
  type EmergencyCommandItem,
  type EmergencyCommandSection,
  isDispatcherEmergencyOperationsPath,
  isDispatcherPatientsPath,
  isDispatcherResourcesPath,
} from '@/lib/dispatcher/emergencyCommandNav'

const SIDEBAR = {
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
} as const

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1.5 px-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: SIDEBAR.muted }}>
        {label}
      </span>
    </div>
  )
}

interface Props {
  onNavigate?: () => void
}

function renderMenuItem(item: EmergencyCommandItem, onNavigate?: () => void, opts?: { workflow?: boolean }) {
  const accentColor = item.accent ? SIDEBAR[item.accent] : SIDEBAR.muted
  return (
    <SidebarMenuLink
      key={item.href + item.label}
      href={item.href}
      label={item.label}
      icon={item.icon}
      exact={item.exact}
      sidebar={SIDEBAR}
      accentColor={accentColor}
      className={`flex items-center gap-2.5 py-2 rounded-lg text-[13px] font-medium ${
        opts?.workflow ? 'pl-2 pr-2' : 'px-2.5'
      }`}
      iconClassName={`shrink-0 ${opts?.workflow ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
      onNavigate={onNavigate}
    />
  )
}

function CollapsibleSection({
  label,
  icon: Icon,
  isActive,
  isOpen,
  setOpen,
  children,
}: {
  label: string
  icon: LucideIcon
  isActive: boolean
  isOpen: boolean
  setOpen: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-semibold rounded-lg"
        style={
          isActive ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.text } : { color: SIDEBAR.secondary }
        }
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = SIDEBAR.panel
            e.currentTarget.style.color = SIDEBAR.text
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = SIDEBAR.secondary
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className="w-4 h-4 shrink-0"
            style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }} />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }} />
        )}
      </button>

      {isOpen && (
        <div
          className="mt-0.5 ml-2 pl-3 py-2 space-y-4 rounded-lg"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function SectionGroups({
  sections,
  onNavigate,
}: {
  sections: EmergencyCommandSection[]
  onNavigate?: () => void
}) {
  return (
    <>
      {sections.map((section, idx) => (
        <div key={`${section.title}-${idx}`}>
          {section.title && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
                style={{ color: SIDEBAR.muted }}
              >
                {section.title}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: SIDEBAR.border }} />
            </div>
          )}

          {section.workflow ? (
            <div className="ml-1 pl-3 space-y-0.5" style={{ borderLeft: '1px dashed rgba(255,255,255,0.12)' }}>
              {section.items.map((item) => renderMenuItem(item, onNavigate, { workflow: true }))}
            </div>
          ) : (
            <div className="space-y-0.5">{section.items.map((item) => renderMenuItem(item, onNavigate))}</div>
          )}
        </div>
      ))}
    </>
  )
}

function FlatItems({ items, onNavigate }: { items: EmergencyCommandItem[]; onNavigate?: () => void }) {
  return <div className="space-y-0.5">{items.map((item) => renderMenuItem(item, onNavigate))}</div>
}

export default function DispatcherEmergencyCommandSidebar({ onNavigate }: Props) {
  const pathname = usePathname()

  const emergencyActive = isDispatcherEmergencyOperationsPath(pathname)
  const patientsActive = isDispatcherPatientsPath(pathname)
  const resourcesActive = isDispatcherResourcesPath(pathname)

  const [emergencyOpen, setEmergencyOpen] = useState(emergencyActive)
  const [patientsOpen, setPatientsOpen] = useState(patientsActive)
  const [resourcesOpen, setResourcesOpen] = useState(resourcesActive)

  useEffect(() => {
    if (emergencyActive) setEmergencyOpen(true)
  }, [emergencyActive])

  useEffect(() => {
    if (patientsActive) setPatientsOpen(true)
  }, [patientsActive])

  useEffect(() => {
    if (resourcesActive) setResourcesOpen(true)
  }, [resourcesActive])

  return (
    <div>
      <SectionLabel label="Emergency Command" />

      <div className="space-y-0.5 px-0.5">
        <CollapsibleSection
          label="Emergency Operations"
          icon={Siren}
          isActive={emergencyActive}
          isOpen={emergencyOpen}
          setOpen={setEmergencyOpen}
        >
          <SectionGroups sections={DISPATCHER_EMERGENCY_SECTIONS} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Patients & Case Records"
          icon={HeartPulse}
          isActive={patientsActive}
          isOpen={patientsOpen}
          setOpen={setPatientsOpen}
        >
          <FlatItems items={DISPATCHER_PATIENTS_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Dispatch Resources"
          icon={Warehouse}
          isActive={resourcesActive}
          isOpen={resourcesOpen}
          setOpen={setResourcesOpen}
        >
          <FlatItems items={DISPATCHER_RESOURCES_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
