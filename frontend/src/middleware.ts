import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple token validation (in production, use proper JWT verification)
function isValidToken(token: string): boolean {
  try {
    // Basic validation - in production, implement proper JWT verification
    if (!token || token.length < 10) return false
    
    // Check if token looks like JWT (has three parts separated by dots)
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    return true
  } catch (error) {
    return false
  }
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/',
  '/home',
  '/about',
  '/contact',
  '/request-ambulance',
  '/track-patient'
]

// Role-based route protection
const ROLE_ROUTES = {
  ADMIN: ['/admin', '/admin/'],
  DISPATCHER: ['/dispatcher', '/dispatcher/'],
  DRIVER: ['/driver', '/driver/'],
  NURSE: ['/nurse', '/nurse/'],
  MANAGER: ['/manager', '/manager/'],
  HOSPITAL: ['/hospital', '/hospital/'],
  PATIENT: ['/patient', '/patient/']
}

function verifyToken(token: string): any {
  try {
    if (!isValidToken(token)) return null

    // Decode the JWT payload (middle segment) — no signature verification in middleware
    // (signature is verified by the backend on every API call)
    const payloadBase64 = token.split('.')[1]
    // atob works in the Next.js Edge runtime
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      isActive: payload.isActive !== false, // default true if missing
    }
  } catch (error) {
    return null
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function getRequiredRole(pathname: string): string | null {
  for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
    if (routes.some(route => pathname.startsWith(route))) {
      return role
    }
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get token from Authorization header or cookies
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
               request.cookies.get('token')?.value

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token
  const payload = verifyToken(token)
  
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('error', 'invalid_token')
    return NextResponse.redirect(loginUrl)
  }

  // Check if user is active
  if (!payload.isActive) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('error', 'account_inactive')
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access
  const requiredRole = getRequiredRole(pathname)
  if (requiredRole && payload.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const roleRedirects: Record<string, string> = {
      ADMIN: '/admin/dashboard',
      DISPATCHER: '/dispatcher/dashboard',
      DRIVER: '/driver/dashboard',
      NURSE: '/nurse/dashboard',
      MANAGER: '/manager/dashboard',
      HOSPITAL: '/hospital/dashboard',
      PATIENT: '/patient/dashboard'
    }

    const userDashboard = roleRedirects[payload.role]
    if (userDashboard) {
      return NextResponse.redirect(new URL(userDashboard, request.url))
    } else {
      // Fallback to login if role is invalid
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Add user info to headers for API routes
  const response = NextResponse.next()
  response.headers.set('x-user-id', payload.sub)
  response.headers.set('x-user-role', payload.role)
  response.headers.set('x-user-email', payload.email)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
