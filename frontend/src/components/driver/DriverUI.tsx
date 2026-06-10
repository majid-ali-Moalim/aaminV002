import { type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDriverStore } from '@/lib/stores/driverStore'

// ─── Priority Badge ────────────────────────────────────────────────────────

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CRITICAL: { label: 'CRITICAL', cls: 'badge-critical' },
    HIGH: { label: 'HIGH', cls: 'badge-high' },
    MEDIUM: { label: 'MEDIUM', cls: 'badge-medium' },
    LOW: { label: 'LOW', cls: 'badge-low' },
  }
  const { label, cls } = map[priority] ?? { label: priority, cls: 'badge-medium' }
  return <span className={`driver-badge ${cls}`}>{label}</span>
}

// ─── Mission Status Badge ──────────────────────────────────────────────────

export function MissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ASSIGNED: { label: 'Assigned', cls: 'badge-assigned' },
    DISPATCHED: { label: 'En Route', cls: 'badge-dispatched' },
    ARRIVED_SCENE: { label: 'On Scene', cls: 'badge-on-scene' },
    ON_SCENE: { label: 'On Scene', cls: 'badge-on-scene' },
    TRANSPORTING: { label: 'Transporting', cls: 'badge-transporting' },
    ARRIVED_HOSPITAL: { label: 'At Hospital', cls: 'badge-hospital' },
    COMPLETED: { label: 'Completed', cls: 'badge-completed' },
    CANCELLED: { label: 'Cancelled', cls: 'badge-cancelled' },
    PENDING: { label: 'Pending', cls: 'badge-pending' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-pending' }
  return <span className={`driver-badge ${cls}`}>{label}</span>
}

// ─── Shift Status Badge ────────────────────────────────────────────────────

export function ShiftBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ON_DUTY: { label: '● On Duty', cls: 'shift-on-duty' },
    AVAILABLE: { label: '● Available', cls: 'shift-available' },
    OFF_DUTY: { label: '● Off Duty', cls: 'shift-off-duty' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'shift-available' }
  return <span className={`shift-badge ${cls}`}>{label}</span>
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────

export function DriverSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="driver-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="driver-skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )
}

// ─── Offline Banner ────────────────────────────────────────────────────────

export function OfflineBanner({ queueCount }: { queueCount: number }) {
  if (queueCount === 0) return null
  return (
    <div className="offline-banner">
      <span>📶 Offline — {queueCount} update{queueCount > 1 ? 's' : ''} queued</span>
    </div>
  )
}

// ─── Info Row ──────────────────────────────────────────────────────────────

export function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: ReactNode }) {
  if (!value) return null
  return (
    <div className="driver-info-row">
      {icon && <span className="driver-info-icon">{icon}</span>}
      <div>
        <p className="driver-info-label">{label}</p>
        <p className="driver-info-value">{value}</p>
      </div>
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`driver-stat-card${accent ? ' accent' : ''}`}>
      <p className="driver-stat-value">{value}</p>
      <p className="driver-stat-label">{label}</p>
      {sub && <p className="driver-stat-sub">{sub}</p>}
    </div>
  )
}
