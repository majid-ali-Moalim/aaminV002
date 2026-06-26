'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Heart,
  Droplets,
  Thermometer,
  Activity,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { nursesService } from '@/lib/api'

export default function TreatmentRecordsTab({ embedded = false }: { embedded?: boolean }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRecords = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await nursesService.getPatientCareRecords()
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching treatment records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords(true)
  }, [])

  const filtered = records.filter(
    (r) =>
      r.emergencyRequest?.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nurse?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nurse?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clinicalNotes?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className={embedded ? 'p-6 pb-12 space-y-6' : 'p-6 max-w-[1600px] mx-auto space-y-6 pb-12'}>
      {!embedded && (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <FileText className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Clinical Archive
            </p>
            <h1 className="text-3xl font-black tracking-tight">Treatment Records</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Vitals, clinical notes, and treatment documentation filed by nursing staff.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchRecords(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => fetchRecords(true)} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking code, nurse, or notes…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading treatment records…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-red-100 transition-all"
            >
              <div className="flex flex-col md:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      #{record.emergencyRequest?.trackingCode || 'TRK-0000'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(record.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                  <div className="flex flex-col items-center">
                    <Heart className="w-4 h-4 text-red-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400">PULSE</span>
                    <span className="text-sm font-black text-slate-900">{record.heartRate || '—'}</span>
                  </div>
                  <div className="flex flex-col items-center px-4 border-x border-slate-100">
                    <Droplets className="w-4 h-4 text-red-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400">O₂ SAT</span>
                    <span className="text-sm font-black text-slate-900">
                      {record.oxygenSaturation != null ? `${record.oxygenSaturation}%` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Thermometer className="w-4 h-4 text-orange-500 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400">TEMP</span>
                    <span className="text-sm font-black text-slate-900">
                      {record.temperature != null ? `${record.temperature}°C` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-red-600 text-[10px] shadow-sm">
                    {record.nurse?.firstName?.[0]}
                    {record.nurse?.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nurse</p>
                    <p className="text-xs font-black text-slate-700">
                      {record.nurse?.firstName} {record.nurse?.lastName}
                    </p>
                  </div>
                </div>
              </div>

              {record.clinicalNotes && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{record.clinicalNotes}</p>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No treatment records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
