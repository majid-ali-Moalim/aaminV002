export type PortalId = 'nurse' | 'dispatcher' | 'driver' | 'hospital' | 'admin'

export function portalPermissionsPath(portal: PortalId): string {
  return `/${portal}/permissions`
}

export function portalPermissionActionPath(portal: PortalId, permissionKey: string): string {
  return `${portalPermissionsPath(portal)}/${encodeURIComponent(permissionKey)}`
}

export function decodePermissionKey(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}
