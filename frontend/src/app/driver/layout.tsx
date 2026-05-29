'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DriverGuard } from '@/components/guards'
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Activity, 
  Settings, 
  LogOut,
  Navigation,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function DriverLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user, logout } = useAuth()

  return (
    <DriverGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation Bar - Mobile First */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700">
                <Navigation className="h-6 w-6" />
              </button>

              {/* Logo and Status */}
              <div className="flex items-center flex-1 md:flex-initial">
                <div className="flex items-center">
                  <Truck className="h-6 w-6 text-red-600 md:h-8 md:w-8" />
                  <div className="ml-2 md:ml-3">
                    <span className="text-lg md:text-xl font-bold text-gray-900">EADS</span>
                    <div className="text-xs text-green-600 font-medium">● ON DUTY</div>
                  </div>
                </div>
              </div>

              {/* Right side items */}
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Quick Actions */}
                <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                  <Phone className="h-5 w-5" />
                </button>
                
                <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                  <MapPin className="h-5 w-5" />
                </button>

                {/* User Info */}
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">Driver</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-red-600">
                      {user?.firstName?.[0] || 'D'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row">
          {/* Mobile Navigation */}
          <nav className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex space-x-4 overflow-x-auto">
              <a href="/driver/dashboard" className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md">
                <Activity className="mr-2 h-4 w-4" />
                Dashboard
              </a>
              <a href="/driver/assignments" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                <Truck className="mr-2 h-4 w-4" />
                Assignments
              </a>
              <a href="/driver/map" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                <MapPin className="mr-2 h-4 w-4" />
                Map
              </a>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 pb-20 md:pb-0">
            <div className="py-4 md:py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>

          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:flex-shrink-0 md:w-64">
            <div className="flex flex-col h-full bg-white border-r border-gray-200">
              <div className="flex-1 flex flex-col">
                <nav className="flex-1 px-3 py-4 space-y-1">
                  {/* Current Status Card */}
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-900">On Duty</p>
                        <p className="text-xs text-green-700">Available for assignments</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <a
                    href="/driver/dashboard"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <Activity className="mr-3 h-5 w-5 flex-shrink-0" />
                    Dashboard
                  </a>

                  <a
                    href="/driver/assignments"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    <Truck className="mr-3 h-5 w-5 flex-shrink-0" />
                    Active Assignment
                  </a>

                  <a
                    href="/driver/map"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    <MapPin className="mr-3 h-5 w-5 flex-shrink-0" />
                    Navigation Map
                  </a>

                  <a
                    href="/driver/history"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    <Clock className="mr-3 h-5 w-5 flex-shrink-0" />
                    Trip History
                  </a>

                  <a
                    href="/driver/profile"
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    <User className="mr-3 h-5 w-5 flex-shrink-0" />
                    My Profile
                  </a>
                </nav>

                {/* Bottom Actions */}
                <div className="border-t border-gray-200 p-3 space-y-1">
                  <button className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 w-full">
                    <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                    Settings
                  </button>
                  <button 
                    onClick={logout}
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 hover:bg-red-100 w-full"
                  >
                    <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="grid grid-cols-4 gap-1 p-2">
            <a href="/driver/dashboard" className="flex flex-col items-center py-2 text-xs text-red-600">
              <Activity className="h-5 w-5 mb-1" />
              Home
            </a>
            <a href="/driver/assignments" className="flex flex-col items-center py-2 text-xs text-gray-600">
              <Truck className="h-5 w-5 mb-1" />
              Jobs
            </a>
            <a href="/driver/map" className="flex flex-col items-center py-2 text-xs text-gray-600">
              <MapPin className="h-5 w-5 mb-1" />
              Map
            </a>
            <button onClick={logout} className="flex flex-col items-center py-2 text-xs text-gray-600">
              <LogOut className="h-5 w-5 mb-1" />
              Out
            </button>
          </div>
        </nav>
      </div>
    </DriverGuard>
  )
}
