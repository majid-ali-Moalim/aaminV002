'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightLeft, Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emergencyRequestsService, systemSetupService } from '@/lib/api'
import type { EmergencyRequest } from '@/types'

type StationRow = { id: string; name: string }

type Props = {
  request: EmergencyRequest
  onTransferred: (updated: EmergencyRequest) => void
}

export default function CaseStationTransferPanel({ request, onTransferred }: Props) {
  const [stations, setStations] = useState<StationRow[]>([])
  const [toStationId, setToStationId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStations, setLoadingStations] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoadingStations(true)
      try {
        const rows = await systemSetupService.getStations()
        const list = Array.isArray(rows) ? rows : []
        setStations(list.filter((s: StationRow & { isActive?: boolean }) => s.isActive !== false))
      } catch {
        setStations([])
      } finally {
        setLoadingStations(false)
      }
    }
    void load()
  }, [])

  const otherStations = stations.filter((s) => s.id !== request.stationId)

  if (loadingStations) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading stations…
      </div>
    )
  }

  if (otherStations.length === 0) {
    return null
  }

  const handleTransfer = async () => {
    if (!toStationId) {
      toast.error('Select a receiving station')
      return
    }
    if (!reason.trim()) {
      toast.error('Transfer reason is required')
      return
    }
    setLoading(true)
    try {
      const updated = await emergencyRequestsService.transferStation(request.id, {
        toStationId,
        reason: reason.trim(),
      })
      toast.success('Case transferred to receiving station')
      onTransferred(updated)
      setReason('')
      setToStationId('')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-slate-900">Transfer to Another Station</h3>
          <p className="text-sm text-slate-600 mt-1">
            Move this case to another station&apos;s pending queue. Current station:{' '}
            <span className="font-semibold">{request.station?.name ?? 'Unassigned'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Receiving Station *
          </label>
          <select
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white"
            value={toStationId}
            onChange={(e) => setToStationId(e.target.value)}
          >
            <option value="">Select station</option>
            {otherStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Transfer Reason *
          </label>
          <input
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Out of coverage area"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleTransfer}
        disabled={loading}
        className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Transferring…
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 mr-2" />
            Transfer Case
          </>
        )}
      </Button>

      {request.caseTransfers && request.caseTransfers.length > 0 ? (
        <div className="pt-3 border-t border-indigo-200/80">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Transfer History</p>
          <ul className="space-y-2 text-sm">
            {request.caseTransfers.slice(0, 3).map((t) => (
              <li key={t.id} className="text-slate-700">
                {t.fromStation?.name ?? '—'} → <strong>{t.toStation?.name}</strong>
                {' · '}
                {new Date(t.createdAt).toLocaleString()}
                {t.transferredBy ? ` · ${t.transferredBy.firstName} ${t.transferredBy.lastName}` : ''}
                {t.reason ? ` — ${t.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
