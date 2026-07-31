'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, ArrowLeftRight } from 'lucide-react'
import { format } from 'date-fns'
import { stationsApi, STATION_TRANSFER_REASONS } from '@/lib/stationsApi'

export default function StationTransfersView({ embedded }: { embedded?: boolean } = {}) {
  const { data, isLoading } = useSWR('stations-transfers', () => stationsApi.getTransfers(100))

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-black text-slate-900">Station Transfers</h1>
          <p className="text-sm text-slate-500">
            Cases moved between stations when resources are unavailable at the home station.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Common transfer reasons</p>
        <div className="flex flex-wrap gap-2">
          {STATION_TRANSFER_REASONS.map((r) => (
            <span key={r} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white border border-slate-200">
              {r}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Case</th>
                <th className="text-left px-4 py-3">From</th>
                <th className="text-left px-4 py-3">To</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">By</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((t: {
                id: string
                caseId: string
                trackingCode: string
                fromStation?: { name: string } | null
                toStation?: { name: string }
                reason: string
                transferredBy?: string | null
                transferredAt: string
                completed: boolean
                accepted: boolean
              }) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/emergency-requests/active?id=${t.caseId}`} className="font-bold text-teal-700">
                      {t.trackingCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.fromStation?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.toStation?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{t.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{t.transferredBy ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(t.transferredAt), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                        t.completed
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.accepted
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {t.completed ? 'Completed' : t.accepted ? 'Accepted' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No transfer history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
