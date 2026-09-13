import { Role } from '@/types'
import type { CaseCompletionRole } from '@/lib/emergency/buildCaseClosureDefaults'

type AuthUserLike = {
  role?: Role | string
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  employee?: {
    firstName?: string
    lastName?: string
    employeeCode?: string | null
    employeeRole?: { name?: string }
  }
}

export function inferCurrentUserCompletionRole(user: AuthUserLike | null): CaseCompletionRole {
  if (!user) return 'ADMIN'
  if (user.role === Role.ADMIN || user.role === 'ADMIN') return 'ADMIN'
  const empRole = user.employee?.employeeRole?.name?.toUpperCase() ?? ''
  if (empRole.includes('DISPATCH')) return 'DISPATCHER'
  if (empRole.includes('NURSE')) return 'NURSE'
  if (empRole.includes('DRIVER')) return 'DRIVER'
  return 'ADMIN'
}

export function currentUserDisplayName(user: AuthUserLike | null): string {
  if (!user) return 'Current user'
  const fromEmployee = [user.employee?.firstName, user.employee?.lastName].filter(Boolean).join(' ').trim()
  if (fromEmployee) return fromEmployee
  const fromUser = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (fromUser) return fromUser
  return user.username || user.email || 'Current user'
}

export function completionRoleLabel(role: CaseCompletionRole): string {
  switch (role) {
    case 'NURSE':
      return 'Nurse'
    case 'DRIVER':
      return 'Driver'
    case 'DISPATCHER':
      return 'Dispatcher'
    case 'ADMIN':
      return 'Admin'
    default:
      return role
  }
}
