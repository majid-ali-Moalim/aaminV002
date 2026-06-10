'use client'

import { usePathname } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import { isModulePathActive, moduleDefaultHref } from '@/lib/dispatcher/navigation'
import { useDispatcherNavigation } from '@/lib/hooks/useDispatcherNavigation'
import AaminLogo from '@/components/brand/AaminLogo'

const SIDEBAR = {
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
} as const

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
  const pathname = usePathname()
  const { logout } = useAuth()
  const { sidebarModules } = useDispatcherNavigation()

  const handleLogout = () => {
    logout()
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
        <div
          className="flex items-center justify-between gap-2 px-4 py-4 shrink-0 border-b"
          style={{ borderColor: SIDEBAR.border }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AaminLogo size="sidebar" onDark />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          <div className="px-2 pt-2 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SIDEBAR.muted }}>
              Dispatcher Operations Center
            </span>
          </div>
          {sidebarModules.map((mod) => {
            const href = moduleDefaultHref(mod)
            const navKey = `dispatcher-${mod.id}`
            const active = isModulePathActive(pathname, mod)
            const Icon = mod.icon
            const showBadge = mod.id === 'emergency' && pendingCount > 0

            return (
              <SidebarNavLink
                key={mod.id}
                navKey={navKey}
                href={href}
                exact={mod.id === 'dashboard' || mod.id === 'profile'}
                onNavigate={onClose}
                className="flex items-center justify-between gap-2 px-2.5 py-2.5 mb-0.5 rounded-lg text-[13px] font-semibold"
                activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text }}
                inactiveStyle={{ color: SIDEBAR.secondary }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: active ? SIDEBAR.text : SIDEBAR.muted }}
                  />
                  <span className="truncate">{mod.label}</span>
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
