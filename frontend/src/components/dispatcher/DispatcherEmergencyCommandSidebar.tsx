'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
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
import {
  DISPATCHER_SIDEBAR,
  DISPATCHER_SIDEBAR_WORKFLOW_DASH,
} from '@/lib/dispatcher/dispatcherSidebarTheme'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'

const SIDEBAR = DISPATCHER_SIDEBAR

type EmergencyBadgeCounts = {
  pending: number
  active: number
  delayed: number
}

function resolveBadgeCount(item: EmergencyCommandItem, counts: EmergencyBadgeCounts): number | undefined {
  if (!item.badgeKey) return undefined
  const count = counts[item.badgeKey]
  return count > 0 ? count : undefined
}

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

function renderMenuItem(
  item: EmergencyCommandItem,
  badgeCounts: EmergencyBadgeCounts,
  onNavigate?: () => void,
  opts?: { workflow?: boolean },
) {
  const accentColor = item.accent ? SIDEBAR[item.accent] : SIDEBAR.muted
  const badge = resolveBadgeCount(item, badgeCounts)
  return (
    <SidebarMenuLink
      key={item.href + item.label}
      href={item.href}
      label={item.label}
      icon={item.icon}
      exact={item.exact}
      sidebar={SIDEBAR}
      accentColor={accentColor}
      badge={badge}
      badgeVariant={item.badgeVariant ?? 'green'}
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
          isActive
            ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.textActive }
            : { color: SIDEBAR.secondary }
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
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown
            className="w-4 h-4 shrink-0"
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
        ) : (
          <ChevronRight
            className="w-4 h-4 shrink-0"
            style={{ color: isActive ? SIDEBAR.textActive : SIDEBAR.muted }}
          />
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
  badgeCounts,
  onNavigate,
}: {
  sections: EmergencyCommandSection[]
  badgeCounts: EmergencyBadgeCounts
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
            <div
              className="ml-1 pl-3 space-y-0.5"
              style={{ borderLeft: `1px dashed ${DISPATCHER_SIDEBAR_WORKFLOW_DASH}` }}
            >
              {section.items.map((item) => renderMenuItem(item, badgeCounts, onNavigate, { workflow: true }))}
            </div>
          ) : (
            <div className="space-y-0.5">{section.items.map((item) => renderMenuItem(item, badgeCounts, onNavigate))}</div>
          )}
        </div>
      ))}
    </>
  )
}

function FlatItems({
  items,
  badgeCounts,
  onNavigate,
}: {
  items: EmergencyCommandItem[]
  badgeCounts: EmergencyBadgeCounts
  onNavigate?: () => void
}) {
  return <div className="space-y-0.5">{items.map((item) => renderMenuItem(item, badgeCounts, onNavigate))}</div>
}

export default function DispatcherEmergencyCommandSidebar({ onNavigate }: Props) {
  const pathname = usePathname()
  const { data: overview } = useSWR('dispatcher-emergency-nav-badges', () => dispatcherDashboardApi.getOverview(), {
    refreshInterval: 30000,
  })

  const badgeCounts: EmergencyBadgeCounts = {
    pending: overview?.kpis?.pendingDispatches ?? 0,
    active: overview?.kpis?.activeMissions ?? 0,
    delayed: overview?.kpis?.delayedMissions ?? 0,
  }

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
          <SectionGroups sections={DISPATCHER_EMERGENCY_SECTIONS} badgeCounts={badgeCounts} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Patients & Case Records"
          icon={HeartPulse}
          isActive={patientsActive}
          isOpen={patientsOpen}
          setOpen={setPatientsOpen}
        >
          <FlatItems items={DISPATCHER_PATIENTS_ITEMS} badgeCounts={badgeCounts} onNavigate={onNavigate} />
        </CollapsibleSection>

        <CollapsibleSection
          label="Dispatch Resources"
          icon={Warehouse}
          isActive={resourcesActive}
          isOpen={resourcesOpen}
          setOpen={setResourcesOpen}
        >
          <FlatItems items={DISPATCHER_RESOURCES_ITEMS} badgeCounts={badgeCounts} onNavigate={onNavigate} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
