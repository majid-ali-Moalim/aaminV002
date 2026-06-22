'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Users,
  Stethoscope,
  Truck,
  Radio,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  DISPATCHER_AMBULANCE_ITEMS,
  DISPATCHER_DRIVER_ITEMS,
  DISPATCHER_MANAGEMENT_ITEMS,
  DISPATCHER_NURSE_ITEMS,
  type FieldOpsItem,
  isDispatcherAmbulancePath,
  isDispatcherDriverPath,
  isDispatcherManagementPath,
  isDispatcherNursePath,
} from '@/lib/dispatcher/fieldOperationsNav'

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

function renderMenuItem(item: FieldOpsItem, onNavigate?: () => void) {
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
      className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-[13px] font-medium"
      iconClassName="w-4 h-4 shrink-0"
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
          className="mt-0.5 ml-2 pl-3 py-2 space-y-0.5 rounded-lg"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function FlatItems({ items, onNavigate }: { items: FieldOpsItem[]; onNavigate?: () => void }) {
  return <>{items.map((item) => renderMenuItem(item, onNavigate))}</>
}

export default function DispatcherFieldOperationsSidebar({ onNavigate }: Props) {
  const pathname = usePathname()

  const driversActive = isDispatcherDriverPath(pathname)
  const nursesActive = isDispatcherNursePath(pathname)
  const ambulancesActive = isDispatcherAmbulancePath(pathname)
  const managementActive = isDispatcherManagementPath(pathname)

  const [driversOpen, setDriversOpen] = useState(driversActive)
  const [nursesOpen, setNursesOpen] = useState(nursesActive)
  const [ambulancesOpen, setAmbulancesOpen] = useState(ambulancesActive)
  const [managementOpen, setManagementOpen] = useState(managementActive)

  useEffect(() => {
    if (driversActive) setDriversOpen(true)
  }, [driversActive])

  useEffect(() => {
    if (nursesActive) setNursesOpen(true)
  }, [nursesActive])

  useEffect(() => {
    if (ambulancesActive) setAmbulancesOpen(true)
  }, [ambulancesActive])

  useEffect(() => {
    if (managementActive) setManagementOpen(true)
  }, [managementActive])

  return (
    <div>
      <SectionLabel label="Field Operations" />

      <div className="space-y-0.5 px-0.5">
        <CollapsibleSection
          label="Driver Management"
          icon={Users}
          isActive={driversActive}
          isOpen={driversOpen}
          setOpen={setDriversOpen}
        >
          <FlatItems items={DISPATCHER_DRIVER_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Nurse Management"
          icon={Stethoscope}
          isActive={nursesActive}
          isOpen={nursesOpen}
          setOpen={setNursesOpen}
        >
          <FlatItems items={DISPATCHER_NURSE_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Ambulance Management"
          icon={Truck}
          isActive={ambulancesActive}
          isOpen={ambulancesOpen}
          setOpen={setAmbulancesOpen}
        >
          <FlatItems items={DISPATCHER_AMBULANCE_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Dispatcher Management"
          icon={Radio}
          isActive={managementActive}
          isOpen={managementOpen}
          setOpen={setManagementOpen}
        >
          <FlatItems items={DISPATCHER_MANAGEMENT_ITEMS} onNavigate={onNavigate} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
