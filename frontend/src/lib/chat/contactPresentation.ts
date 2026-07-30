import type { ChatContact, ChatContactRelationship } from '@/lib/api'

export function relationshipLabel(contact: ChatContact): string | null {
  if (!contact.relationship) return null
  if (contact.relationship === 'assigned_dispatcher') {
    return contact.isPrimaryContact ? '★ Case Dispatcher' : 'Case Dispatcher'
  }
  if (contact.relationship === 'assigned_nurse') return 'Assigned Nurse'
  if (contact.relationship === 'assigned_driver') return 'Assigned Driver'
  return null
}

export function roleBadgeLabel(contact: ChatContact): string {
  switch (contact.roleCategory) {
    case 'dispatcher':
      return 'Dispatcher'
    case 'driver':
      return 'Driver'
    case 'nurse':
      return 'Nurse'
    case 'admin':
      return 'Admin'
    default:
      return contact.role || 'Staff'
  }
}

export function roleRingClass(roleCategory?: string, isPrimary?: boolean): string {
  if (isPrimary) return 'ring-[3px] ring-amber-400 ring-offset-2'
  switch (roleCategory) {
    case 'dispatcher':
      return 'ring-2 ring-amber-300 ring-offset-1'
    case 'driver':
      return 'ring-2 ring-blue-400 ring-offset-1'
    case 'nurse':
      return 'ring-2 ring-violet-400 ring-offset-1'
    case 'admin':
      return 'ring-2 ring-slate-400 ring-offset-1'
    default:
      return ''
  }
}

export function contactRowHighlightClass(contact: ChatContact, active: boolean): string {
  if (active) return 'bg-emerald-50/60'
  if (contact.isPrimaryContact) return 'bg-amber-50/80 hover:bg-amber-50 border-l-4 border-l-amber-400'
  if (contact.relationship) return 'bg-sky-50/50 hover:bg-sky-50/80 border-l-4 border-l-sky-300'
  return 'hover:bg-slate-50'
}

export function sortChatContacts(contacts: ChatContact[]): ChatContact[] {
  return [...contacts].sort((a, b) => {
    const ap = a.sortPriority ?? 99
    const bp = b.sortPriority ?? 99
    if (ap !== bp) return ap - bp
    if (a.isPrimaryContact && !b.isPrimaryContact) return -1
    if (!a.isPrimaryContact && b.isPrimaryContact) return 1
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    if (at !== bt) return bt - at
    return a.name.localeCompare(b.name)
  })
}

export function splitCaseTeamContacts(contacts: ChatContact[]): {
  caseTeam: ChatContact[]
  others: ChatContact[]
} {
  const sorted = sortChatContacts(contacts)
  const caseTeam = sorted.filter((c) => c.relationship)
  const others = sorted.filter((c) => !c.relationship)
  return { caseTeam, others }
}

export type { ChatContactRelationship }
