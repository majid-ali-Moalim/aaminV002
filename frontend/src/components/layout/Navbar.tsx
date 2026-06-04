'use client'



import { useState, useEffect } from 'react'

import Link from 'next/link'

import { usePathname } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'

import { Menu, X, Phone, User, LogOut } from 'lucide-react'

import NotificationBell from '../notifications/NotificationBell'

import { Role } from '@/types'



const Navbar = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [isScrolled, setIsScrolled] = useState(false)

  const pathname = usePathname()

  const { user, logout } = useAuth()



  useEffect(() => {

    const handleScroll = () => {

      setIsScrolled(window.scrollY > 10)

    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)

  }, [])



  const publicNavItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/track', label: 'Track Patient' },
  ]



  const getDashboardLink = () => {

    if (!user) return '/login'

    

    // Use the same logic as AuthContext for consistent redirection

    if (user.role === Role.ADMIN) {

      return '/admin/dashboard'

    } 

    

    if (user.role === Role.EMPLOYEE) {

      const roleName = (user as any).employee?.employeeRole?.name?.toUpperCase()

      if (roleName === 'DISPATCHER') return '/dispatcher/dashboard'

      if (roleName === 'DRIVER') return '/driver/dashboard'

      if (roleName === 'NURSE') return '/nurse/dashboard'

      return '/admin/dashboard' // Fallback for other employees

    }

    

    if (user.role === Role.PATIENT) {

      return '/patient/dashboard'

    }

    

    return '/'

  }



  const isActive = (href: string) => {

    if (href === '/') {

      return pathname === '/'

    }

    return pathname.startsWith(href)

  }

  const portalPrefixes = ['/admin', '/dispatcher', '/driver', '/nurse', '/manager', '/hospital', '/patient']
  if (portalPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null
  }



  return (

    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${

      isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-white'

    }`}>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-between items-center h-16">

          {/* Logo */}

          <div className="flex items-center">

            <Link href="/" className="flex items-center space-x-3">

              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">

                <Phone className="w-6 h-6 text-white" />

              </div>

              <span className="text-xl font-bold text-gray-900">Aamin Ambulance</span>

            </Link>

          </div>



          {/* Desktop Navigation */}

          <div className="hidden md:flex items-center space-x-8">

            {publicNavItems.map((item) => (

              <Link

                key={item.href}

                href={item.href}

                className={`text-sm font-medium transition-colors relative ${

                  isActive(item.href)

                    ? 'text-red-600'

                    : 'text-gray-700 hover:text-red-600'

                }`}

              >

                {item.label}

                {isActive(item.href) && (

                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-600" />

                )}

              </Link>

            ))}

          </div>



          {/* Right side buttons */}

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

                <div className="flex items-center space-x-2">

                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">

                    <User className="w-4 h-4 text-gray-600" />

                  </div>

                  <span className="text-sm font-medium text-gray-700">

                    {user.firstName} {user.lastName}

                  </span>

                </div>

                <button

                  onClick={logout}

                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"

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

                  Admin

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



          {/* Mobile menu button */}

          <div className="md:hidden">

            <button

              onClick={() => setIsMenuOpen(!isMenuOpen)}

              className="p-2 rounded-md text-gray-700 hover:text-red-600 hover:bg-gray-100 transition-colors"

            >

              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}

            </button>

          </div>

        </div>



        {/* Mobile Navigation */}

        {isMenuOpen && (

          <div className="md:hidden">

            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">

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

                    <Link

                      href={getDashboardLink()}

                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"

                      onClick={() => setIsMenuOpen(false)}

                    >

                      Dashboard

                    </Link>

                    <div className="px-3 py-2">

                      <div className="flex items-center space-x-2">

                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">

                          <User className="w-4 h-4 text-gray-600" />

                        </div>

                        <span className="text-sm font-medium text-gray-700">

                          {user.firstName} {user.lastName}

                        </span>

                      </div>

                    </div>

                    <button

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

                      Admin

                    </Link>

                    <Link

                      href="/hire-ambulance"

                      className="block mx-3 mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-base font-semibold hover:bg-red-700 transition-colors text-center"

                      onClick={() => setIsMenuOpen(false)}

                    >

                      Hire an Ambulance

                    </Link>

                  </>

                )}

              </div>

            </div>

          </div>

        )}

      </div>

    </nav>

  )

}



export default Navbar

