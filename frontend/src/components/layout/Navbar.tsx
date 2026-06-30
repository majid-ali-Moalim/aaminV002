'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Menu, X, LogOut } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import AuthPortalTopBar from '@/components/auth/AuthPortalTopBar'
import AaminLogo from '@/components/brand/AaminLogo'
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar'
import { Role } from '@/types'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const publicNavItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  const getDashboardLink = () => {
    if (!user) return '/login'
    if (user.role === Role.ADMIN) return '/admin/dashboard'
    if (user.role === Role.EMPLOYEE) {
      const roleName = (user as any).employee?.employeeRole?.name?.toUpperCase()
      if (roleName === 'DISPATCHER') return '/dispatcher/dashboard'
      if (roleName === 'DRIVER') return '/driver/dashboard'
      if (roleName === 'NURSE') return '/nurse/dashboard'
      return '/admin/dashboard'
    }
    if (user.role === Role.HOSPITAL) return '/hospital/dashboard'
    if (user.role === Role.PATIENT) return '/patient/dashboard'
    return '/'
  }

  const getProfileLink = () => {
    if (!user) return '/login'
    if (user.role === Role.ADMIN) return '/admin/profile'
    if (user.role === Role.EMPLOYEE) {
      const roleName = (user as any).employee?.employeeRole?.name?.toUpperCase()
      if (roleName === 'DISPATCHER') return '/dispatcher/profile'
      if (roleName === 'DRIVER') return '/driver/profile'
      if (roleName === 'NURSE') return '/nurse/profile'
      return '/admin/profile'
    }
    if (user.role === Role.HOSPITAL) return '/hospital/profile'
    if (user.role === Role.PATIENT) return '/patient/dashboard'
    return '/login'
  }

  const profilePhoto =
    user?.employee?.profilePhoto ??
    (user as { profile?: { avatar?: string } })?.profile?.avatar ??
    (user as { patient?: { avatar?: string } })?.patient?.avatar ??
    null
  const displayFirstName = user?.firstName || user?.employee?.firstName || ''
  const displayLastName = user?.lastName || user?.employee?.lastName || ''

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const portalPrefixes = ['/admin', '/dispatcher', '/driver', '/nurse', '/manager', '/hospital', '/patient']
  if (portalPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null
  }

  const hideOnAuth = pathname === '/login' || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  if (hideOnAuth) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
        <AuthPortalTopBar />
        <nav
          className={`site-nav-enter transition-all duration-300 border-b border-gray-100 ${
            isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-white'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center min-w-0">
                <Link href="/" className="flex items-center gap-3 min-w-0">
                  <AaminLogo size="sm" priority />
                  <span className="text-lg sm:text-xl font-bold text-gray-900 truncate">Aamin Ambulance</span>
                </Link>
              </div>

              <div className="hidden md:flex items-center space-x-8">
                {publicNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors relative ${
                      isActive(item.href) ? 'text-red-600' : 'text-gray-700 hover:text-red-600'
                    }`}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-600" />
                    )}
                  </Link>
                ))}
              </div>

              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <Link
                      href={getDashboardLink()}
                      className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <NotificationBell />
                    <Link
                      href={getProfileLink()}
                      className="flex items-center space-x-2 hover:opacity-90 transition-opacity"
                      title={`${displayFirstName} ${displayLastName}`.trim() || user.username}
                    >
                      <EmployeeAvatar
                        profilePhoto={profilePhoto}
                        firstName={displayFirstName}
                        lastName={displayLastName}
                        size="sm"
                        gradient="from-red-600 to-red-700"
                        className="!w-8 !h-8 !rounded-full !text-xs ring-2 ring-red-100"
                      />
                      <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                        {displayFirstName} {displayLastName}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                      aria-label="Log out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/hire-ambulance"
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                    >
                      Request an Ambulance
                    </Link>
                  </>
                )}
              </div>

              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-gray-700 hover:text-red-600 hover:bg-gray-100 transition-colors"
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {isMenuOpen && (
              <div className="md:hidden pb-4">
                <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
                  {publicNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.href)
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    {user ? (
                      <>
                        <div className="flex items-center gap-3 px-3 py-2">
                          <EmployeeAvatar
                            profilePhoto={profilePhoto}
                            firstName={displayFirstName}
                            lastName={displayLastName}
                            size="sm"
                            gradient="from-red-600 to-red-700"
                            className="!w-10 !h-10 !rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {displayFirstName} {displayLastName}
                          </span>
                        </div>
                        <Link
                          href={getProfileLink()}
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          My Profile
                        </Link>
                        <Link
                          href={getDashboardLink()}
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            logout()
                            setIsMenuOpen(false)
                          }}
                          className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          href="/hire-ambulance"
                          className="block mx-3 mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-base font-semibold hover:bg-red-700 transition-colors text-center"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Request an Ambulance
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
  )
}

export default Navbar
