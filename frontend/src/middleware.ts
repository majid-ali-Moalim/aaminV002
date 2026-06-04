import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isValidToken(token: string): boolean {
  if (!token || token.length < 10) return false
  return token.split('.').length === 3
}

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/dispatcher/login',
  '/driver/login',
  '/register',
  '/forgot-password',
  '/reset-password',
])

const PUBLIC_PREFIXES = [
  '/about',
  '/contact',
  '/track',
  '/hire-ambulance',
  '/ambulance-tracking',
  '/request-ambulance',
  '/track-patient',
]

const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/admin'],
  DISPATCHER: ['/dispatcher'],
  DRIVER: ['/driver'],
  NURSE: ['/nurse'],
  MANAGER: ['/manager'],
  HOSPITAL: ['/hospital'],
  PATIENT: ['/patient'],
}

const PORTAL_DASHBOARDS: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  DISPATCHER: '/dispatcher/dashboard',
  DRIVER: '/driver',
  NURSE: '/nurse/dashboard',
  MANAGER: '/manager/dashboard',
  HOSPITAL: '/hospital/dashboard',
  PATIENT: '/patient/dashboard',
}

type JwtPayload = {
  sub: string
  email?: string
  role: string
  employeeRole?: string | null
  isActive?: boolean
  exp?: number
}

function verifyToken(token: string): JwtPayload | null {
  try {
    if (!isValidToken(token)) return null
    const payloadBase64 = token.split('.')[1]
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as JwtPayload
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function resolvePortalRole(payload: JwtPayload): string {
  const role = payload.role ?? ''
  const name = String(payload.employeeRole ?? '').toUpperCase()

  if (role === 'ADMIN') return 'ADMIN'
  if (role === 'PATIENT') return 'PATIENT'
  if (role === 'DISPATCHER' || name.includes('DISPATCH')) return 'DISPATCHER'
  if (role === 'DRIVER' || name.includes('DRIVER')) return 'DRIVER'
  if (role === 'NURSE' || name.includes('NURSE') || name.includes('PARAMEDIC')) return 'NURSE'
  if (role === 'MANAGER') return 'MANAGER'
  if (role === 'HOSPITAL') return 'HOSPITAL'
  return role
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function getRequiredPortalRole(pathname: string): string | null {
  if (pathname.startsWith('/dispatcher/login') || pathname.startsWith('/driver/login')) {
    return null
  }
  for (const [portal, prefixes] of Object.entries(ROLE_ROUTES)) {
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) {
      return portal
    }
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const rawCookie = request.cookies.get('token')?.value
  const token =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    (rawCookie ? decodeURIComponent(rawCookie) : undefined)

  if (!token) {
    return NextResponse.next()
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.next()
  }

  if (payload.isActive === false) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'account_inactive')
    return NextResponse.redirect(loginUrl)
  }

  const portalRole = resolvePortalRole(payload)
  const requiredPortal = getRequiredPortalRole(pathname)

  if (requiredPortal && portalRole !== requiredPortal) {
    const dashboard = PORTAL_DASHBOARDS[portalRole]
    if (dashboard) {
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', payload.sub)
  response.headers.set('x-user-role', payload.role)
  response.headers.set('x-portal-role', portalRole)
  if (payload.email) response.headers.set('x-user-email', payload.email)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
