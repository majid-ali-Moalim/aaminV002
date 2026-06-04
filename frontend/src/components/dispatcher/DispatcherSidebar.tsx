'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, LogOut, X, Radio } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import {
  DISPATCHER_MODULES,
  isModulePathActive,
  isViewActive,
  moduleHref,
  type NavModule,
} from '@/lib/dispatcher/navigation'

const SIDEBAR = {
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
} as const

function NavSection({
  module,
  pendingCount,
  onNavigate,
}: {
  module: NavModule
  pendingCount: number
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = isModulePathActive(pathname, module)
  const [open, setOpen] = useState(isActive || module.id === 'dashboard')
  const Icon = module.icon
  const isDashboard = module.id === 'dashboard'

  if (isDashboard) {
    const item = module.items[0]
    const href = moduleHref(module, item.slug)
    const navKey = `${module.id}-${item.slug}`
    const active = isViewActive(pathname, module, item.slug)
    return (
      <SidebarNavLink
        navKey={navKey}
        href={href}
        exact
        onNavigate={onNavigate}
        className="flex items-center gap-2.5 px-2.5 py-2 mx-0.5 rounded-lg text-[13px] font-medium"
        activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text, fontWeight: 600 }}
        inactiveStyle={{ color: SIDEBAR.secondary }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: active ? SIDEBAR.text : SIDEBAR.muted }} />
        <span className="truncate">{module.label}</span>
      </SidebarNavLink>
    )
  }

  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-2 mx-0.5 rounded-lg text-[13px] font-semibold"
        style={
          isActive
            ? { backgroundColor: SIDEBAR.panel, color: SIDEBAR.text }
            : { color: SIDEBAR.secondary }
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? SIDEBAR.text : SIDEBAR.muted }} />
          <span className="truncate text-left">{module.label}</span>
        </div>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR.muted }} />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: SIDEBAR.muted }} />
        )}
      </button>
      {open && (
        <div
          className="mt-0.5 ml-2 pl-2 py-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {module.items.map((item) => {
            const href = moduleHref(module, item.slug)
            const navKey = `${module.id}-${item.slug}`
            const active = isViewActive(pathname, module, item.slug)
            const showBadge = item.badgeKey === 'pending' && pendingCount > 0
            const ItemIcon = item.icon
            return (
              <SidebarNavLink
                key={navKey}
                navKey={navKey}
                href={href}
                onNavigate={onNavigate}
                className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium"
                activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text, fontWeight: 600 }}
                inactiveStyle={{ color: SIDEBAR.secondary }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {showBadge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: SIDEBAR.primary }}
                  >
                    {pendingCount}
                  </span>
                )}
              </SidebarNavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface Props {
  pendingCount?: number
  open?: boolean
  onClose?: () => void
}

export default function DispatcherSidebarSections({
  pendingCount = 0,
  open = false,
  onClose,
}: Props) {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/dispatcher/login')
  }
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`w-72 max-w-[90vw] h-screen fixed left-0 top-0 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: `linear-gradient(180deg, ${SIDEBAR.bg} 0%, #0a101c 100%)`,
          borderRight: `1px solid ${SIDEBAR.border}`,
        }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4 shrink-0 border-b" style={{ borderColor: SIDEBAR.border }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: SIDEBAR.primary }}>
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white truncate">Dispatcher Command</h1>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: SIDEBAR.primary }}>
                EADS · Ops Center
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1 custom-scrollbar">
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SIDEBAR.muted }}>
              Modules
            </span>
          </div>
          {DISPATCHER_MODULES.map((mod) => (
            <NavSection
              key={mod.id}
              module={mod}
              pendingCount={pendingCount}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="p-2 shrink-0" style={{ borderTop: `1px solid ${SIDEBAR.border}` }}>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-[12px] font-medium rounded-lg"
            style={{ color: SIDEBAR.muted }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
