'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  Siren,
} from 'lucide-react'
import { notificationsService } from '@/lib/api'
import type { AlertRecord } from '@/lib/notifications/types'
import { PRIORITY_STYLES } from '@/lib/notifications/types'
import { Button } from '@/components/ui/button'

const TABS = [
  { id: 'ACTIVE', label: 'Active Alerts' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'ESCALATED', label: 'Escalated' },
  { id: 'RESOLVED', label: 'Resolved' },
] as const

export default function AlertCenterView() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('ACTIVE')

  const load = async () => {
    setLoading(true)
    try {
      const params: { status?: string; priority?: string } = {}
      if (tab === 'ACTIVE') params.status = 'ACTIVE'
      if (tab === 'CRITICAL') {
        params.status = 'ACTIVE'
        params.priority = 'CRITICAL'
      }
      if (tab === 'ESCALATED') params.status = 'ESCALATED'
      if (tab === 'RESOLVED') params.status = 'RESOLVED'
      const data = await notificationsService.getAlerts(params)
      setAlerts(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [tab])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Alert Center</h1>
        <p className="text-gray-500 mt-1">
          Monitor active, critical, escalated, and resolved operational alerts
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-t-xl transition-colors ${
              tab === t.id
                ? 'bg-red-600 text-white'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border p-16 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No alerts in this view</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => {
            const ps = PRIORITY_STYLES[alert.priority] ?? PRIORITY_STYLES.MEDIUM
            return (
              <article
                key={alert.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 border-l-4 ${ps.border}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                      {alert.priority === 'CRITICAL' ? (
                        <Siren className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {alert.alertType.replace(/_/g, ' ')}
                      </p>
                      <h3 className="font-black text-gray-900 dark:text-white">{alert.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.message}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${ps.badge}`}>
                    {alert.priority}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`font-black uppercase tracking-widest ${
                      alert.status === 'RESOLVED' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {alert.status}
                  </span>
                  {alert.relatedId && (
                    <span className="font-mono text-gray-400">{alert.relatedId}</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {alert.actionUrl && (
                    <Button
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => router.push(alert.actionUrl!)}
                    >
                      View details
                    </Button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={async () => {
                        await notificationsService.resolveAlert(alert.id)
                        load()
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
