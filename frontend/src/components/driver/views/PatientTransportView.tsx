'use client'

import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPanel } from '@/components/driver/DriverModuleShell'
import { PriorityBadge } from '@/components/driver/DriverUI'

export default function PatientTransportView() {
  const { activeMission } = useDriverStore()

  if (!activeMission) {
    return <DriverPanel title="Patient Transport" empty="No active transport. Assignments appear when on mission." />
  }

  const p = activeMission.patient

  return (
    <div className="driver-form-stack">
      <DriverPanel title="Patient Information">
        <dl className="driver-dl-grid">
          <div><dt>Name</dt><dd>{p?.fullName || 'Unknown'}</dd></div>
          <div><dt>Age</dt><dd>{p?.age ?? '—'}</dd></div>
          <div><dt>Gender</dt><dd>{p?.gender ?? '—'}</dd></div>
          <div><dt>Case Type</dt><dd>{activeMission.incidentCategory?.name || 'Emergency'}</dd></div>
          <div><dt>Priority</dt><dd><PriorityBadge priority={activeMission.priority} /></dd></div>
        </dl>
      </DriverPanel>

      <DriverPanel title="Transport Tracking">
        <dl className="driver-dl-grid">
          <div><dt>Pickup</dt><dd>{activeMission.pickupLocation}</dd></div>
          <div><dt>Destination</dt><dd>{activeMission.destination || 'Hospital TBD'}</dd></div>
          <div><dt>Assigned</dt><dd>{activeMission.assignedAt ? new Date(activeMission.assignedAt).toLocaleString() : '—'}</dd></div>
          <div><dt>En Route</dt><dd>{activeMission.dispatchedAt ? new Date(activeMission.dispatchedAt).toLocaleString() : '—'}</dd></div>
        </dl>
      </DriverPanel>

      <DriverPanel title="Handover Confirmation">
        <div className="driver-form-field">
          <label>Receiving Facility</label>
          <input className="driver-input" placeholder="Hospital name" defaultValue={activeMission.destination || ''} />
        </div>
        <div className="driver-form-field">
          <label>Receiving Staff</label>
          <input className="driver-input" placeholder="Staff name" />
        </div>
        <div className="driver-form-field">
          <label>Transport Notes</label>
          <textarea className="driver-input driver-textarea" rows={3} placeholder="Delays, route issues, observations..." />
        </div>
        <button type="button" className="driver-quick-action-btn btn-green">Confirm Handover</button>
      </DriverPanel>
    </div>
  )
}
