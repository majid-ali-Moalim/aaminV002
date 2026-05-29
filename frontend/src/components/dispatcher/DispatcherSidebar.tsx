'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Layers,
  Phone,
  Truck,
  User,
  Shield,
  PlusSquare,
  MessageSquare,
  FileText,
  FileBarChart,
  Users,
  Settings,
  Activity,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

const MENU = [
  { href: '/dispatcher/dashboard', label: 'Dashboard', icon: Home, exact: true },
  { href: '/dispatcher/emergencies', label: 'Emergency Requests', icon: Layers, badgeKey: 'pending' as const },
  { href: '/dispatcher/emergencies', label: 'Dispatch Operations', icon: Phone },
  { href: '/dispatcher/fleet', label: 'Ambulance Fleet', icon: Truck },
  { href: '/dispatcher/staff', label: 'Driver Management', icon: User },
  { href: '/dispatcher/staff', label: 'Nurse / Medic', icon: Shield },
  { href: '/dispatcher/communications', label: 'Hospital Coordination', icon: PlusSquare },
  { href: '/dispatcher/communications', label: 'Communication Center', icon: MessageSquare },
  { href: '/dispatcher/cases', label: 'Incident Logs', icon: FileText },
  { href: '/dispatcher/cases', label: 'Reports & Analytics', icon: FileBarChart },
  { href: '/dispatcher/dashboard', label: 'Shift Management', icon: Users },
  { href: '/dispatcher/profile', label: 'Settings', icon: Settings },
]

interface Props {
  pendingCount?: number
}

export default function DispatcherSidebar({ pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/dispatcher/login')
  }

  return (
    <aside className="w-64 bg-[#0B0F19] text-white h-screen fixed left-0 top-0 flex flex-col border-r border-[#1F2937] z-30">
      <div className="flex items-center gap-3 px-6 py-6 shrink-0">
        <div className="w-11 h-11 bg-[#EF4444] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Aamin</h1>
          <p className="text-[10px] font-bold text-[#EF4444] tracking-widest mt-0.5">AMBULANCE · EADS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
        {MENU.map((item, idx) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          const showBadge = item.badgeKey === 'pending' && pendingCount > 0

          return (
            <Link
              key={`${item.label}-${idx}`}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 mx-3 rounded-xl transition-all ${
                isActive && item.label === 'Dashboard'
                  ? 'bg-[#EF4444]/10 border-l-4 border-[#EF4444] text-[#EF4444]'
                  : isActive
                    ? 'bg-white/5 text-white border-l-4 border-[#EF4444]/50'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#EF4444]' : 'text-[#6B7280]'}`} />
                <span className="font-medium text-sm truncate">{item.label}</span>
              </div>
              {showBadge && (
                <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#1F2937] shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
