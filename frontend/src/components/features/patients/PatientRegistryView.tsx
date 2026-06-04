'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Phone,
  Calendar,
  Activity,
  Loader2,
  UserPlus,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react'
import { patientsService } from '@/lib/api'
import { Patient } from '@/types'
import { Button } from '@/components/ui/button'

export default function PatientRegistryView() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true)
        const data = await patientsService.getAll()
        setPatients(data)
      } catch (err) {
        console.error('Failed to fetch patients:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPatients()
  }, [])

  const filteredPatients = useMemo(() => {
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm),
    )
  }, [patients, searchTerm])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Patient Registry
            </p>
            <h1 className="text-3xl font-black tracking-tight">Patients</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Registered patient profiles — demographics, contact details, and case history.
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/patients/new')}
            className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-red-600 bg-red-50' },
          {
            label: 'With Contact',
            value: patients.filter((p) => p.phone).length,
            icon: Phone,
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'With Patient Code',
            value: patients.filter((p) => p.patientCode).length,
            icon: Activity,
            color: 'text-blue-600 bg-blue-50',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, patient ID, or phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading patients…</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No patients found</p>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search or register a new patient</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all"
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                    {patient.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black truncate">{patient.fullName}</p>
                    <p className="text-xs text-red-100 font-mono">{patient.patientCode || 'UID-PENDING'}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-red-500 shrink-0" />
                  {patient.phone || 'No contact data'}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                  {[patient.age ? `${patient.age} years` : null, patient.gender].filter(Boolean).join(' · ') ||
                    'Demographics unavailable'}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" className="rounded-xl flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-red-600 border-red-100">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
