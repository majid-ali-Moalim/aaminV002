'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardList,
  Heart,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Stethoscope,
  Truck,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { emergencyRequestsService } from '@/lib/api'
import { useNurseCases } from '@/lib/nurse/useNurseCases'
import PickupGpsPanel from '@/components/features/emergency/PickupGpsPanel'

type Props = {
  selectedCaseId?: string | null
}

export default function PatientCareActiveView({ selectedCaseId }: Props) {
  const router = useRouter()
  const { primaryCase, cases, loading, reload } = useNurseCases()
  const mission = selectedCaseId
    ? cases.find((c) => c.id === selectedCaseId) || primaryCase
    : primaryCase

  const goTab = (tab: string, caseId?: string) => {
    const q = caseId ? `?tab=${tab}&caseId=${caseId}` : `?tab=${tab}`
    router.push(`/nurse/patient-care${q}`)
  }

  const requestHospital = async () => {
    if (!mission) return
    const hospital = prompt('Enter destination hospital name:')
    if (!hospital) return
    try {
      await emergencyRequestsService.update(mission.id, { destination: hospital })
      toast.success('Hospital request sent to dispatch')
      reload()
    } catch {
      toast.error('Could not update destination')
    }
  }

  const markReadyTransport = async () => {
    if (!mission) return
    try {
      await emergencyRequestsService.updateStatus(mission.id, 'TRANSPORTING')
      toast.success('Patient marked ready for transport')
      reload()
    } catch {
      toast.error('Could not update mission status')
    }
  }

  if (loading && !mission) {
    return (
      <div className="nurse-loading">
        <Loader2 className="animate-spin" size={28} />
        <span>Loading active patient…</span>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="nurse-empty-card">
        <Stethoscope size={36} className="text-red-400 mb-3 mx-auto" />
        <p>No active patient assigned.</p>
        <Link href="/nurse/patient-care?tab=assigned" className="nurse-btn ghost mt-4 inline-flex">
          View assigned missions
        </Link>
      </div>
    )
  }

  const m = mission
  const driverName = m.driver
    ? `${m.driver.firstName || ''} ${m.driver.lastName || ''}`.trim()
    : '—'

  return (
    <div className="npc-active">
      <div className="npc-active-header">
        <div>
          <p className="npc-kicker">Current patient</p>
          <h2 className="npc-case-code">{m.trackingCode}</h2>
          <div className="nurse-case-top mt-2">
            <span className={`nurse-priority ${m.priority?.toLowerCase()}`}>{m.priority}</span>
            <span className="nurse-status-chip">{m.status?.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <button type="button" className="nurse-btn ghost" onClick={() => reload(true)}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="npc-info-grid">
        <InfoItem label="Case ID" value={m.trackingCode} icon={<ClipboardList size={14} />} />
        <InfoItem label="Patient name" value={m.patient?.fullName || m.callerName} icon={<User size={14} />} />
        <InfoItem
          label="Age / Gender"
          value={[m.patient?.age, m.patient?.gender].filter(Boolean).join(' · ') || '—'}
        />
        <InfoItem label="Emergency type" value={m.incidentCategory?.name || m.patientCondition} icon={<AlertTriangle size={14} />} />
        <InfoItem label="Priority" value={m.priority} />
        <InfoItem label="Location" value={m.pickupLocation} icon={<MapPin size={14} />} />
        <InfoItem label="Mission status" value={m.status?.replace(/_/g, ' ')} icon={<Activity size={14} />} />
        <InfoItem label="Driver" value={driverName} icon={<Truck size={14} />} />
        <InfoItem label="Ambulance" value={m.ambulance?.ambulanceNumber || '—'} />
        <InfoItem label="Dispatcher" value={m.dispatcher?.user?.username || 'Dispatch'} />
      </div>

      <PickupGpsPanel request={m} tone="dark" title="Patient pickup GPS" />

      {m.patientCondition && (
        <div className="npc-notes-box">
          <p className="npc-notes-label">Clinical summary</p>
          <p>{m.patientCondition}</p>
          {m.notes && <p className="mt-2 text-zinc-400">{m.notes}</p>}
        </div>
      )}

      <section className="npc-actions-section">
        <h3>Clinical actions</h3>
        <div className="npc-action-grid">
          <button type="button" className="nurse-btn primary" onClick={() => goTab('assessments', m.id)}>
            <Stethoscope size={16} /> Start Assessment
          </button>
          <button type="button" className="nurse-btn ghost" onClick={() => router.push(`/nurse/medical-records?tab=vitals&caseId=${m.id}`)}>
            <Heart size={16} /> Record Vital Signs
          </button>
          <button type="button" className="nurse-btn ghost" onClick={() => router.push(`/nurse/medical-records?tab=notes&caseId=${m.id}`)}>
            <ClipboardList size={16} /> Add Clinical Notes
          </button>
          <button type="button" className="nurse-btn ghost" onClick={() => goTab('treatment', m.id)}>
            <Activity size={16} /> Add Treatment
          </button>
          <button type="button" className="nurse-btn ghost" onClick={requestHospital}>
            <Building2 size={16} /> Request Hospital
          </button>
          <button type="button" className="nurse-btn primary" onClick={markReadyTransport}>
            <Truck size={16} /> Mark Ready For Transport
          </button>
        </div>
      </section>

      {m.driver?.phone && (
        <a href={`tel:${m.driver.phone}`} className="nurse-btn ghost w-full justify-center">
          <Phone size={16} /> Contact Driver
        </a>
      )}

      <p className="npc-updated muted">
        Last updated {format(new Date(m.updatedAt || m.createdAt), 'MMM d, yyyy h:mm a')}
      </p>
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string
  value?: string | null
  icon?: React.ReactNode
}) {
  return (
    <div className="npc-info-item">
      <p className="npc-info-label">{icon} {label}</p>
      <p className="npc-info-value">{value?.trim() || '—'}</p>
    </div>
  )
}
