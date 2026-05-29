'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDriverStore } from '@/lib/stores/driverStore'
import { driverMissionsApi } from '@/lib/driverApi'
import { DriverHeader } from '@/components/driver/DriverHeader'
import { DriverBottomNav } from '@/components/driver/DriverBottomNav'
import { MissionStatusBadge, PriorityBadge, DriverSkeleton } from '@/components/driver/DriverUI'
import { MapPin, Clock, User, ChevronRight, Filter } from 'lucide-react'
import { format } from 'date-fns'

type TabType = 'active' | 'completed' | 'cancelled'

export default function DriverMissionsPage() {
  const router = useRouter()
  const { isAuthenticated, activeMission } = useDriverStore()
  const [tab, setTab] = useState<TabType>('active')
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  const loadHistory = useCallback(async (status: string, p: number) => {
    setLoading(true)
    try {
      const data = await driverMissionsApi.getHistory(p, 15, status)
      setHistory(data.missions || [])
      setTotalPages(data.totalPages || 1)
    } catch (_) {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'active') {
      loadHistory(tab.toUpperCase(), page)
    } else {
      setLoading(false)
    }
  }, [tab, page, loadHistory])

  const tabs: { id: TabType; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="driver-app">
      <DriverHeader title="Missions" />
      <main className="driver-main">
        {/* Tabs */}
        <div className="driver-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`driver-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setPage(1) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active Tab */}
        {tab === 'active' && (
          <div className="driver-tab-content">
            {activeMission ? (
              <Link href={`/driver/missions/${activeMission.id}`} className="driver-mission-list-card active-glow">
                <div className="driver-mlc-top">
                  <span className="driver-mlc-code">{activeMission.trackingCode}</span>
                  <div className="driver-mlc-badges">
                    <MissionStatusBadge status={activeMission.status} />
                    <PriorityBadge priority={activeMission.priority} />
                  </div>
                </div>
                <div className="driver-mlc-row">
                  <User size={13} />
                  <span>{activeMission.patient?.fullName || 'Unknown Patient'}</span>
                </div>
                <div className="driver-mlc-row">
                  <MapPin size={13} />
                  <span>{activeMission.pickupLocation}</span>
                </div>
                {activeMission.incidentCategory && (
                  <div className="driver-mlc-row">
                    <span className="driver-mlc-type">{activeMission.incidentCategory.name}</span>
                  </div>
                )}
                <div className="driver-mlc-footer">
                  <span>Assigned {activeMission.assignedAt ? format(new Date(activeMission.assignedAt), 'MMM d, h:mm a') : '—'}</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ) : (
              <div className="driver-empty-state">
                <span className="driver-empty-icon">✅</span>
                <p>No active missions</p>
                <span>You will be notified when a new emergency is assigned</span>
              </div>
            )}
          </div>
        )}

        {/* History Tabs */}
        {tab !== 'active' && (
          <div className="driver-tab-content">
            {loading ? (
              <div className="driver-card"><DriverSkeleton lines={5} /></div>
            ) : history.length === 0 ? (
              <div className="driver-empty-state">
                <span className="driver-empty-icon">{tab === 'completed' ? '📋' : '❌'}</span>
                <p>No {tab} missions</p>
              </div>
            ) : (
              <>
                {history.map((m) => (
                  <Link key={m.id} href={`/driver/missions/${m.id}`} className="driver-mission-list-card">
                    <div className="driver-mlc-top">
                      <span className="driver-mlc-code">{m.trackingCode}</span>
                      <div className="driver-mlc-badges">
                        <MissionStatusBadge status={m.status} />
                        <PriorityBadge priority={m.priority} />
                      </div>
                    </div>
                    <div className="driver-mlc-row">
                      <User size={13} />
                      <span>{m.patient?.fullName || 'Unknown Patient'}</span>
                    </div>
                    <div className="driver-mlc-row">
                      <MapPin size={13} />
                      <span>{m.pickupLocation}</span>
                    </div>
                    <div className="driver-mlc-footer">
                      <span>
                        {m.completedAt
                          ? format(new Date(m.completedAt), 'MMM d, yyyy h:mm a')
                          : m.createdAt
                          ? format(new Date(m.createdAt), 'MMM d, yyyy')
                          : '—'}
                      </span>
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="driver-pagination">
                    <button
                      className="driver-page-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <span className="driver-page-info">Page {page} of {totalPages}</span>
                    <button
                      className="driver-page-btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <DriverBottomNav />
    </div>
  )
}
