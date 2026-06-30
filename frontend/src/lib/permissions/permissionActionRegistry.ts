'use client'

import type { ComponentType } from 'react'
import type { PortalId } from './portal'

export type PermissionActionProps = {
  portal: PortalId
  permissionKey: string
  backHref: string
}

type RegistryEntry = {
  /** Same UI the admin portal uses for this permission */
  load: () => Promise<{ default: ComponentType<any> }>
  /** Props passed to the loaded component (admin-equivalent configuration) */
  props?: (ctx: PermissionActionProps) => Record<string, unknown>
  /** Full-screen forms (driver/nurse registration) */
  fullBleed?: boolean
}

/**
 * Maps permission keys to the same components/admin pages used in the admin portal.
 * All actions open inside the current portal's My Permissions module only.
 */
export const PERMISSION_ACTION_REGISTRY: Partial<Record<string, RegistryEntry>> = {
  'driver.create': {
    load: () => import('@/components/drivers/AddDriverForm'),
    fullBleed: true,
    props: (ctx) => ({
      listPath: ctx.backHref,
      systemSetupPath: `/${ctx.portal}/profile`,
      persistKey: `${ctx.portal}-perm-driver-create`,
    }),
  },
  'driver.view': {
    load: () => import('@/app/admin/drivers/page'),
  },
  'driver.edit': {
    load: () => import('@/app/admin/drivers/page'),
  },
  'nurse.create': {
    load: () => import('@/components/nurses/AddNurseForm'),
    fullBleed: true,
  },
  'nurse.view': {
    load: () => import('@/app/admin/nurses/page'),
  },
  'nurse.edit': {
    load: () => import('@/app/admin/nurses/page'),
  },
  'case.create': {
    load: () => import('@/components/features/emergency/NewEmergencyCaseForm'),
    fullBleed: true,
    props: (ctx) => ({
      context: 'admin',
      returnPath: ctx.backHref,
    }),
  },
  'dispatch.board': {
    load: () => import('@/app/admin/emergency-requests/pending/page'),
  },
  'case.triage': {
    load: () => import('@/app/admin/emergency-requests/pending/page'),
  },
  'report.view': {
    load: () => import('@/app/admin/reports/page'),
  },
  'report.kpi': {
    load: () => import('@/app/admin/dashboard/kpi/page'),
  },
  'hospital.view': {
    load: () => import('@/app/admin/hospitals/page'),
  },
  'hospital.manage': {
    load: () => import('@/app/admin/hospitals/page'),
  },
  'ambulance.create': {
    load: () => import('@/app/admin/ambulances/add/page'),
    fullBleed: true,
  },
  'ambulance.assign': {
    load: () => import('@/app/admin/ambulances/assignments/page'),
  },
  'employee.attendance': {
    load: () => import('@/app/admin/employees/attendance/page'),
  },
  'patient.view': {
    load: () => import('@/app/admin/patients/page'),
  },
}

export function getPermissionRegistryEntry(key: string): RegistryEntry | undefined {
  return PERMISSION_ACTION_REGISTRY[key]
}

export function hasPermissionAction(key: string): boolean {
  return Boolean(PERMISSION_ACTION_REGISTRY[key])
}
