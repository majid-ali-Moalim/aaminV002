'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Activity,
  BedDouble,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Gauge,
  HeartPulse,
  Loader2,
  RadioTower,
  Save,
  ShieldAlert,
  Siren,
  Stethoscope,
  Truck,
  Users,
  XCircle,
} from 'lucide-react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

const AVAILABILITY_OPTIONS = [
  'Available',
  'Limited Capacity',
  'Full Capacity',
  'Emergency Only',
  'Temporarily Unavailable',
  'Under Maintenance',
]

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

export default function HospitalDashboardView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    const load = () =>
      hospitalAppApi
        .getDashboard()
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false))

    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return <div className="hosp-loading">Loading dashboard…</div>
  }

  const k = data?.kpis ?? {}
  const hospital = data?.hospital ?? {}
  const readiness = data?.readiness ?? {}
  const capabilities = Array.isArray(hospital.medicalCapabilities)
    ? hospital.medicalCapabilities
    : []
  const totalBeds = Number(hospital.beds ?? 0)
  const occupiedBeds = Number(hospital.occupiedBeds ?? 0)
  const totalIcuBeds = Number(hospital.icuTotalBeds ?? 0)
  const occupiedIcuBeds = Number(hospital.icuOccupiedBeds ?? 0)
  const availableBeds = Number(k.availableBeds ?? Math.max(0, totalBeds - occupiedBeds))
  const availableIcuBeds = Number(k.icuAvailable ?? Math.max(0, totalIcuBeds - occupiedIcuBeds))
  const alerts = data?.alerts ?? []

  const updateAvailabilityStatus = async (availabilityStatus: string) => {
    setSavingStatus(true)
    try {
      await hospitalAppApi.updateCapacity({
        availabilityStatus,
        capacityStatus: availabilityStatus,
        operationalStatus:
          availabilityStatus === 'Under Maintenance'
            ? 'Maintenance'
            : availabilityStatus === 'Temporarily Unavailable'
              ? 'Inactive'
              : 'Active',
      })
      const refreshed = await hospitalAppApi.getDashboard()
      setData(refreshed)
      toast.success('Hospital availability published to dispatch')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update availability')
    } finally {
      setSavingStatus(false)
    }
  }

  const departments = [
    { name: 'Emergency Department', status: hospital.emergencyUnitStatus ?? 'Operational' },
    { name: 'ICU', status: availableIcuBeds > 0 ? 'Available' : 'Full' },
    {
      name: 'Surgery',
      status: capabilities.includes('Surgery Support') && hospital.operatingRooms > 0 ? 'Available' : 'Unavailable',
    },
    { name: 'Trauma Unit', status: capabilities.includes('Trauma Care') ? 'Available' : 'Unavailable' },
    { name: 'Pediatrics', status: capabilities.includes('Pediatric Care') ? 'Available' : 'Unavailable' },
    { name: 'Maternity', status: capabilities.includes('Maternity Care') ? 'Available' : 'Unavailable' },
    { name: 'Cardiology', status: capabilities.includes('Cardiology Support') ? 'Available' : 'Unavailable' },
    { name: 'Neurology', status: capabilities.includes('Neurology Support') ? 'Available' : 'Unavailable' },
  ]

  return (
    <div className="hosp-dash hosp-ops">
      <section className="hosp-ops-hero">
        <div>
          <span className="hosp-live-pill"><RadioTower size={14} /> Live operations center</span>
          <h2>{hospital.name ?? 'Hospital Dashboard'}</h2>
          <p>
            Availability, capacity, handover, and service capability shared with dispatchers,
            admins, coordinators, nurses, and drivers.
          </p>
        </div>
        <div className="hosp-status-publisher">
          <label>Hospital Availability Status</label>
          <div className="hosp-status-row">
            <select
              value={hospital.availabilityStatus ?? hospital.capacityStatus ?? 'Available'}
              onChange={(e) => updateAvailabilityStatus(e.target.value)}
              disabled={savingStatus}
            >
              {AVAILABILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button
              className="hosp-btn primary"
              type="button"
              disabled={savingStatus}
              onClick={() => updateAvailabilityStatus(hospital.availabilityStatus ?? 'Available')}
            >
              {savingStatus ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Publish
            </button>
          </div>
          <small>Visible immediately in dispatch hospital selection and admin coordination views.</small>
        </div>
      </section>

      <div className="hosp-kpi-grid">
        <Kpi icon={Siren} label="Incoming Today" value={k.incomingToday ?? 0} tone="red" />
        <Kpi icon={ShieldAlert} label="Pending Cases" value={k.pendingIncoming ?? 0} tone="amber" />
        <Kpi icon={CheckCircle2} label="Accepted Cases" value={k.acceptedToday ?? 0} tone="green" />
        <Kpi icon={XCircle} label="Rejected Cases" value={k.rejectedToday ?? 0} tone="rose" />
        <Kpi icon={Activity} label="Patients Received" value={k.patientsReceived ?? 0} tone="blue" />
        <Kpi icon={BedDouble} label="Available Beds" value={availableBeds} tone="teal" />
        <Kpi icon={HeartPulse} label="Available ICU Beds" value={availableIcuBeds} tone="purple" />
        <Kpi icon={Truck} label="Ambulances En Route" value={k.enRoute ?? 0} tone="indigo" />
        <Kpi icon={Clock3} label="Avg Handover Time" value={`${k.averageHandoverTime ?? 0}m`} tone="slate" />
      </div>

      <div className="hosp-ops-grid">
        <section className="hosp-card hosp-readiness-card">
          <div className="hosp-readiness-ring" style={{ ['--score' as any]: readiness.score ?? 0 }}>
            <span>{readiness.score ?? 0}%</span>
          </div>
          <div>
            <h3>Emergency Readiness Score</h3>
            <p className="hosp-card-copy">
              Calculated from available beds, ICU capacity, emergency department status, and
              operational availability.
            </p>
            <div className="hosp-metric-bars">
              <MetricBar label="Bed utilization" value={readiness.bedUtilization ?? 0} />
              <MetricBar label="ICU utilization" value={readiness.icuUtilization ?? 0} />
            </div>
          </div>
        </section>

        <section className="hosp-card">
          <h3>Automatic Warnings</h3>
          <div className="hosp-alert-list">
            {alerts.length === 0 && (
              <div className="hosp-alert ok">
                <CheckCircle2 size={16} />
                <div>
                  <strong>No active warnings</strong>
                  <span>Capacity and emergency readiness are within operating thresholds.</span>
                </div>
              </div>
            )}
            {alerts.map((alert: any) => (
              <div className={`hosp-alert ${alert.severity}`} key={alert.id}>
                <BellRing size={16} />
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="hosp-dash-columns">
        <section className="hosp-card">
          <h3>Real-Time Activity Timeline</h3>
          <ul className="hosp-activity">
            {(data?.activityFeed ?? []).length === 0 && <li className="muted">No recent activity</li>}
            {(data?.activityFeed ?? []).map((e: any) => (
              <li key={e.id}>
                <span className="time">{format(new Date(e.time), 'HH:mm')}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="hosp-card">
          <h3>Operational Snapshot</h3>
          <dl className="hosp-dl">
            <div><dt>Hospital</dt><dd>{hospital.name ?? '—'}</dd></div>
            <div><dt>Code</dt><dd>{hospital.hospitalCode ?? '—'}</dd></div>
            <div><dt>Capacity</dt><dd>{hospital.capacityStatus ?? '—'}</dd></div>
            <div><dt>Emergency Dept</dt><dd>{hospital.emergencyUnitStatus ?? '—'}</dd></div>
            <div><dt>En Route</dt><dd>{k.enRoute ?? 0} ambulances</dd></div>
            <div><dt>Handover Queue</dt><dd>{k.handoverQueue ?? 0} patients</dd></div>
            <div><dt>Pending Review</dt><dd>{k.pendingIncoming ?? 0} cases</dd></div>
          </dl>
          <p className="hosp-hint"><Truck size={14} /> Ambulances en route update in real time</p>
        </section>
      </div>

      <div className="hosp-ops-grid">
        <section className="hosp-card">
          <h3>Department Availability</h3>
          <div className="hosp-dept-grid">
            {departments.map((dept) => (
              <div className="hosp-dept-row" key={dept.name}>
                <span><Building2 size={14} /> {dept.name}</span>
                <StatusBadge status={dept.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="hosp-card">
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
          <p className="hosp-card-copy">
            Dispatch compatibility filters use these capabilities before assignment.
          </p>
        </section>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <div className={`hosp-kpi hosp-kpi--${tone}`}>
      <Icon size={20} />
      <span className="hosp-kpi-value">{value}</span>
      <span className="hosp-kpi-label">{label}</span>
    </div>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const bounded = Math.max(0, Math.min(100, value))
  return (
    <div className="hosp-metric">
      <div><span>{label}</span><strong>{bounded}%</strong></div>
      <div className="hosp-bar"><span style={{ width: `${bounded}%` }} /></div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`hosp-status-badge ${normalized}`}>{status}</span>
}
