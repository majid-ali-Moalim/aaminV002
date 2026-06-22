'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Phone,
  Loader2,
  FileText,
  Activity,
  Droplets,
  Calendar,
  X,
  Hash,
} from 'lucide-react'
import { patientsService } from '@/lib/api'
import { Patient } from '@/types'
import { Button } from '@/components/ui/button'
import {
  formatBloodType,
  formatDateShort,
  formatGender,
  formatPatientAge,
} from '@/lib/patients/patientDisplay'

export type PatientPortal = 'admin' | 'dispatcher'

function patientPaths(portal: PatientPortal) {
  const base = portal === 'dispatcher' ? '/dispatcher/patients' : '/admin/patients'
  return {
    patients: base,
    cases: `${base}/cases`,
  }
}

export interface PatientRegistryViewProps {
  portal?: PatientPortal
}

export default function PatientRegistryView({ portal = 'admin' }: PatientRegistryViewProps) {
  const paths = patientPaths(portal)
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  useEffect(() => {
    patientsService
      .getAll()
      .then(setPatients)
      .catch((err) => console.error('Failed to fetch patients:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredPatients = useMemo(() => {
    return patients
      .filter((p) => {
        const q = searchTerm.toLowerCase().trim()
        const matchesSearch =
          !q ||
          p.fullName.toLowerCase().includes(q) ||
          p.patientCode?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && p.isActive) ||
          (statusFilter === 'inactive' && !p.isActive)
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [patients, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const totalCases = patients.reduce((sum, p) => sum + (p.totalEmergencies ?? 0), 0)
    const withCases = patients.filter((p) => (p.totalEmergencies ?? 0) > 0).length
    const active = patients.filter((p) => p.isActive).length
    return { total: patients.length, totalCases, withCases, active }
  }, [patients])

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Master Patient Registry
            </p>
            <h1 className="text-3xl font-black tracking-tight">Patients</h1>
            <p className="text-red-100/80 mt-2 max-w-2xl text-sm leading-relaxed">
              One profile per person — demographics and contact details. The same patient may call
              ambulance service many times over years; each mission is stored under Patient Cases.
            </p>
          </div>
          <Link href={paths.cases}>
            <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold shadow-lg">
              <FileText className="w-4 h-4 mr-2" />
              Patient Cases
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: stats.total, icon: Users, tone: 'red' },
          { label: 'Total Case History', value: stats.totalCases, icon: FileText, tone: 'blue' },
          { label: 'Patients with Cases', value: stats.withCases, icon: Activity, tone: 'amber' },
          { label: 'Active Profiles', value: stats.active, icon: Activity, tone: 'emerald' },
        ].map((item) => {
          const Icon = item.icon
          const toneClass =
            item.tone === 'red'
              ? 'bg-red-50 text-red-600'
              : item.tone === 'blue'
                ? 'bg-blue-50 text-blue-600'
                : item.tone === 'amber'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {item.label}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${toneClass}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient ID, name, or phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/10"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  'Patient ID',
                  'Full Name',
                  'Phone',
                  'Gender',
                  'Age',
                  'Blood Group',
                  'Total Cases',
                  'Last Emergency',
                  'Status',
                  '',
                ].map((h) => (
                  <th
                    key={h || 'actions'}
                    className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Loading patients…
                    </p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No patients found</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-red-50/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                        {patient.patientCode}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center text-sm font-black shrink-0">
                          {patient.fullName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{patient.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {patient.phone || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatGender(patient.gender)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-800">
                      {formatPatientAge(patient)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                        <Droplets className="w-3.5 h-3.5 text-red-500" />
                        {formatBloodType(patient.bloodType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(
                            paths.cases + `?patient=${encodeURIComponent(patient.patientCode)}`,
                          )
                        }}
                        className="min-w-[2rem] h-8 px-2 rounded-lg bg-slate-900 text-white text-sm font-black hover:bg-red-600 transition-colors"
                      >
                        {patient.totalEmergencies ?? 0}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDateShort(patient.lastEmergencyDate)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          patient.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {patient.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPatient(patient)
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSelectedPatient(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 text-white shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black mb-4">
                {selectedPatient.fullName.charAt(0)}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-200">Patient Profile</p>
              <h2 className="text-2xl font-black mt-1">{selectedPatient.fullName}</h2>
              <p className="font-mono text-sm text-red-100 mt-1">{selectedPatient.patientCode}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <dl className="space-y-4">
                {[
                  { icon: Phone, label: 'Phone', value: selectedPatient.phone },
                  { icon: Hash, label: 'Gender', value: formatGender(selectedPatient.gender) },
                  {
                    icon: Calendar,
                    label: 'Date of Birth',
                    value: formatDateShort(selectedPatient.dateOfBirth),
                  },
                  { icon: Activity, label: 'Age', value: formatPatientAge(selectedPatient) },
                  {
                    icon: Droplets,
                    label: 'Blood Group',
                    value: formatBloodType(selectedPatient.bloodType),
                  },
                  {
                    icon: FileText,
                    label: 'Total Cases',
                    value: String(selectedPatient.totalEmergencies ?? 0),
                  },
                  {
                    icon: Calendar,
                    label: 'Last Emergency',
                    value: formatDateShort(selectedPatient.lastEmergencyDate),
                  },
                ].map((row) => {
                  const Icon = row.icon
                  return (
                    <div key={row.label} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {row.label}
                        </dt>
                        <dd className="text-sm font-bold text-slate-900 mt-0.5">{row.value || '—'}</dd>
                      </div>
                    </div>
                  )
                })}
              </dl>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href={`${paths.cases}?patient=${encodeURIComponent(selectedPatient.patientCode)}`}
                  onClick={() => setSelectedPatient(null)}
                >
                  <Button className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 font-black">
                    <FileText className="w-4 h-4 mr-2" />
                    View {selectedPatient.totalEmergencies ?? 0} case
                    {(selectedPatient.totalEmergencies ?? 0) === 1 ? '' : 's'}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setSelectedPatient(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
