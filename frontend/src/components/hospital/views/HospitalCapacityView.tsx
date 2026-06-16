'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

const CAPACITY_OPTIONS = [
  'Available',
  'Limited Capacity',
  'Full Capacity',
  'Emergency Only',
  'Temporarily Unavailable',
  'Under Maintenance',
]

const EMERGENCY_DEPARTMENT_OPTIONS = ['Available', 'Busy', 'Full', 'Closed']

const SERVICE_MATRIX = [
  { label: 'Trauma Care', capability: 'Trauma Care' },
  { label: 'Surgery', capability: 'Surgery Support' },
  { label: 'ICU', capability: 'ICU Capability' },
  { label: 'Maternity', capability: 'Maternity Care' },
  { label: 'Pediatrics', capability: 'Pediatric Care' },
  { label: 'Cardiology', capability: 'Cardiology Support' },
  { label: 'Burn Unit', capability: 'Burn Treatment' },
  { label: 'Neurosurgery', capability: 'Neurology Support' },
]

export default function HospitalCapacityView() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    beds: '',
    occupiedBeds: '',
    icuTotalBeds: '',
    icuOccupiedBeds: '',
    emergencyBeds: '',
    operatingRooms: '',
    capacityStatus: 'Available',
    emergencyUnitStatus: 'Available',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    hospitalAppApi.getProfile().then((p) => {
      setProfile(p)
      const h = p?.hospital ?? {}
      setForm({
        beds: String(h.beds ?? ''),
        occupiedBeds: String(h.occupiedBeds ?? ''),
        icuTotalBeds: String(h.icuTotalBeds ?? ''),
        icuOccupiedBeds: String(h.icuOccupiedBeds ?? ''),
        emergencyBeds: String(h.emergencyBeds ?? ''),
        operatingRooms: String(h.operatingRooms ?? ''),
        capacityStatus: h.availabilityStatus ?? h.capacityStatus ?? 'Available',
        emergencyUnitStatus: h.emergencyUnitStatus ?? 'Available',
      })
    })
  }, [])

  const hospital = profile?.hospital ?? {}
  const capabilities = Array.isArray(hospital.medicalCapabilities)
    ? hospital.medicalCapabilities
    : []
  const totalBeds = Number(form.beds) || 0
  const occupiedBeds = Number(form.occupiedBeds) || 0
  const totalIcuBeds = Number(form.icuTotalBeds) || 0
  const occupiedIcuBeds = Number(form.icuOccupiedBeds) || 0
  const availableBeds = Math.max(0, totalBeds - occupiedBeds)
  const availableIcuBeds = Math.max(0, totalIcuBeds - occupiedIcuBeds)
  const bedUtilization = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const icuUtilization = totalIcuBeds ? Math.round((occupiedIcuBeds / totalIcuBeds) * 100) : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await hospitalAppApi.updateCapacity({
        beds: Number(form.beds) || 0,
        occupiedBeds: Number(form.occupiedBeds) || 0,
        icuTotalBeds: Number(form.icuTotalBeds) || 0,
        icuOccupiedBeds: Number(form.icuOccupiedBeds) || 0,
        emergencyBeds: Number(form.emergencyBeds) || 0,
        operatingRooms: Number(form.operatingRooms) || 0,
        capacityStatus: form.capacityStatus,
        availabilityStatus: form.capacityStatus,
        emergencyUnitStatus: form.emergencyUnitStatus,
        operationalStatus:
          form.capacityStatus === 'Under Maintenance'
            ? 'Maintenance'
            : form.capacityStatus === 'Temporarily Unavailable'
              ? 'Inactive'
              : 'Active',
      })
      toast.success('Capacity updated — dispatch will see changes immediately')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div className="hosp-loading"><Loader2 className="animate-spin" size={24} /></div>

  return (
    <form onSubmit={submit} className="hosp-capacity-page">
      <section className="hosp-card">
        <h3>Capacity & Availability</h3>
        <p className="text-sm text-slate-500 mb-4">
          Changes sync instantly with dispatcher hospital selection, admin coordination, and assignment compatibility.
        </p>
        <div className="hosp-form-grid">
          <label>Total beds<input type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} /></label>
          <label>Occupied beds<input type="number" value={form.occupiedBeds} onChange={(e) => setForm({ ...form, occupiedBeds: e.target.value })} /></label>
          <label>Available beds<input type="number" value={availableBeds} readOnly /></label>
          <label>Bed utilization<input type="text" value={`${bedUtilization}%`} readOnly /></label>
          <label>Total ICU beds<input type="number" value={form.icuTotalBeds} onChange={(e) => setForm({ ...form, icuTotalBeds: e.target.value })} /></label>
          <label>Occupied ICU beds<input type="number" value={form.icuOccupiedBeds} onChange={(e) => setForm({ ...form, icuOccupiedBeds: e.target.value })} /></label>
          <label>Available ICU beds<input type="number" value={availableIcuBeds} readOnly /></label>
          <label>ICU utilization<input type="text" value={`${icuUtilization}%`} readOnly /></label>
          <label>Emergency beds<input type="number" value={form.emergencyBeds} onChange={(e) => setForm({ ...form, emergencyBeds: e.target.value })} /></label>
          <label>Operating rooms<input type="number" value={form.operatingRooms} onChange={(e) => setForm({ ...form, operatingRooms: e.target.value })} /></label>
          <label>Emergency Department status
            <select value={form.emergencyUnitStatus} onChange={(e) => setForm({ ...form, emergencyUnitStatus: e.target.value })}>
              {EMERGENCY_DEPARTMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label>Hospital availability status
            <select value={form.capacityStatus} onChange={(e) => setForm({ ...form, capacityStatus: e.target.value })}>
              {CAPACITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="hosp-ops-grid">
        <div className="hosp-card">
          <h3>Department Availability</h3>
          <div className="hosp-dept-grid">
            <DepartmentStatus name="Emergency Department" status={form.emergencyUnitStatus} />
            <DepartmentStatus name="ICU" status={availableIcuBeds > 0 ? 'Available' : 'Full'} />
            <DepartmentStatus name="Surgery" status={capabilities.includes('Surgery Support') && Number(form.operatingRooms) > 0 ? 'Available' : 'Unavailable'} />
            <DepartmentStatus name="Trauma Unit" status={capabilities.includes('Trauma Care') ? 'Available' : 'Unavailable'} />
            <DepartmentStatus name="Pediatrics" status={capabilities.includes('Pediatric Care') ? 'Available' : 'Unavailable'} />
            <DepartmentStatus name="Maternity" status={capabilities.includes('Maternity Care') ? 'Available' : 'Unavailable'} />
            <DepartmentStatus name="Cardiology" status={capabilities.includes('Cardiology Support') ? 'Available' : 'Unavailable'} />
            <DepartmentStatus name="Neurology" status={capabilities.includes('Neurology Support') ? 'Available' : 'Unavailable'} />
          </div>
        </div>

        <div className="hosp-card">
          <h3>Service Capability Matrix</h3>
          <div className="hosp-service-grid">
            {SERVICE_MATRIX.map((service) => {
              const enabled = capabilities.includes(service.capability)
              return (
                <div className={`hosp-service ${enabled ? 'enabled' : 'disabled'}`} key={service.label}>
                  {enabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  {service.label}
                </div>
              )
            })}
          </div>
          <p className="hosp-card-copy mt-3">
            Service capabilities are configured by administrators and used by dispatch compatibility checks.
          </p>
        </div>
      </section>

      <button type="submit" className="hosp-btn primary" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Capacity & Availability
      </button>
    </form>
  )
}

function DepartmentStatus({ name, status }: { name: string; status: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="hosp-dept-row">
      <span>{name}</span>
      <span className={`hosp-status-badge ${normalized}`}>{status}</span>
    </div>
  )
}
