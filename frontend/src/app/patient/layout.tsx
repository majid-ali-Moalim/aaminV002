'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { PatientGuard } from '@/components/guards'
import { 
  Heart, 
  User, 
  Activity, 
  Settings, 
  LogOut,
  Phone,
  Calendar,
  FileText,
  AlertTriangle,
  Menu
} from 'lucide-react'

export default function PatientLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user, logout } = useAuthStore()

  return (
    <PatientGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Branding */}
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center">
                    <Heart className="h-8 w-8 text-red-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">EADS</span>
                  </div>
                </div>
                <div className="hidden md:block ml-10">
                  <div className="flex items-baseline space-x-4">
                    <span className="text-sm text-gray-500">Patient Portal</span>
                  </div>
                </div>
              </div>

              {/* Right side items */}
              <div className="flex items-center space-x-4">
                {/* Emergency Request */}
                <button className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Ambulance
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">
                        {user?.firstName?.[0] || user?.email?.[0] || 'P'}
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
                      <p className="text-xs text-red-600 font-medium">PATIENT</p>
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
              <div className="flex-1 flex flex-col min-h-0 bg-blue-800 border-r border-blue-900">
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {/* Dashboard */}
                  <a
                    href="/patient/dashboard"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-900 text-white hover:bg-blue-700"
                  >
                    <Activity className="mr-3 h-5 w-5 flex-shrink-0" />
                    Dashboard
                  </a>

                  {/* Request Ambulance */}
                  <a
                    href="/patient/request"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-900 text-white hover:bg-blue-700"
                  >
                    <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0" />
                    Request Ambulance
                  </a>

                  {/* Track Request */}
                  <a
                    href="/patient/track"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
                  >
                    <Phone className="mr-3 h-5 w-5 flex-shrink-0" />
                    Track Request
                  </a>

                  {/* Medical History */}
                  <a
                    href="/patient/history"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
                  >
                    <FileText className="mr-3 h-5 w-5 flex-shrink-0" />
                    Medical History
                  </a>

                  {/* Appointments */}
                  <a
                    href="/patient/appointments"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
                  >
                    <Calendar className="mr-3 h-5 w-5 flex-shrink-0" />
                    Appointments
                  </a>

                  {/* Profile */}
                  <a
                    href="/patient/profile"
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-700 hover:text-white"
                  >
                    <User className="mr-3 h-5 w-5 flex-shrink-0" />
                    My Profile
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
    </PatientGuard>
  )
}
