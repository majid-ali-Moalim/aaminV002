'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { ManagerGuard } from '@/components/guards'
import { 
  BarChart2, 
  Users, 
  Activity, 
  Settings, 
  LogOut,
  TrendingUp,
  FileText,
  Calendar,
  Building2,
  Bell,
  Menu
} from 'lucide-react'

export default function ManagerLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user, logout } = useAuthStore()

  return (
    <ManagerGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Branding */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center">
                    <BarChart2 className="h-8 w-8 text-red-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">EADS</span>
                  </div>
                </div>
                <div className="hidden md:block ml-10">
                  <div className="flex items-baseline space-x-4">
                    <span className="text-sm text-gray-500">Manager Dashboard</span>
                  </div>
                </div>
              </div>

              {/* Right side items */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">
                        {user?.firstName?.[0] || user?.email?.[0] || 'M'}
                      </span>
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-red-600 font-medium">MANAGER</p>
                    </div>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </button>
                    <button 
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar Navigation */}
          <aside className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-64">
              <div className="flex-1 flex flex-col min-h-0 bg-red-800 border-r border-red-900">
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {/* Dashboard */}
                  <a
                    href="/manager/dashboard"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-red-900 text-white hover:bg-red-700"
                  >
                    <BarChart2 className="mr-3 h-5 w-5 flex-shrink-0" />
                    Dashboard
                  </a>

                  {/* Analytics */}
                  <a
                    href="/manager/analytics"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <TrendingUp className="mr-3 h-5 w-5 flex-shrink-0" />
                    Analytics
                  </a>

                  {/* Staff Management */}
                  <a
                    href="/manager/staff"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <Users className="mr-3 h-5 w-5 flex-shrink-0" />
                    Staff Management
                  </a>

                  {/* Operations */}
                  <a
                    href="/manager/operations"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <Activity className="mr-3 h-5 w-5 flex-shrink-0" />
                    Operations
                  </a>

                  {/* Reports */}
                  <a
                    href="/manager/reports"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <FileText className="mr-3 h-5 w-5 flex-shrink-0" />
                    Reports
                  </a>

                  {/* Facilities */}
                  <a
                    href="/manager/facilities"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <Building2 className="mr-3 h-5 w-5 flex-shrink-0" />
                    Facilities
                  </a>

                  {/* Schedule */}
                  <a
                    href="/manager/schedule"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-100 hover:bg-red-700 hover:text-white"
                  >
                    <Calendar className="mr-3 h-5 w-5 flex-shrink-0" />
                    Schedule
                  </a>
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ManagerGuard>
  )
}
