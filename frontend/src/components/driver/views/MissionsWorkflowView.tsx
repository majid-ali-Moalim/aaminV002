'use client'

import { useDriverStore } from '@/lib/stores/driverStore'
import { MISSION_WORKFLOW_STEPS } from '@/lib/driver/navigation'
import { MissionStatusBadge } from '@/components/driver/DriverUI'
import { DriverPanel } from '@/components/driver/DriverModuleShell'

const STATUS_ORDER = ['PENDING', 'ASSIGNED', 'DISPATCHED', 'ON_SCENE', 'PATIENT_ONBOARD', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'HANDOVER', 'COMPLETED']

function mapStatus(status: string): string {
  if (status === 'ASSIGNED') return 'ASSIGNED'
  if (status === 'DISPATCHED') return 'DISPATCHED'
  if (status === 'ON_SCENE') return 'ON_SCENE'
  if (status === 'TRANSPORTING') return 'TRANSPORTING'
  if (status === 'ARRIVED_HOSPITAL') return 'ARRIVED_HOSPITAL'
  if (status === 'COMPLETED') return 'COMPLETED'
  return 'PENDING'
}

export default function MissionsWorkflowView() {
  const { activeMission } = useDriverStore()
  const current = activeMission ? mapStatus(activeMission.status) : 'PENDING'
  const currentIdx = STATUS_ORDER.indexOf(current === 'TRANSPORTING' && current ? current : current)

  return (
    <div className="driver-workflow-wrap">
      {activeMission ? (
        <div className="driver-workflow-header">
          <span className="driver-mlc-code">{activeMission.trackingCode}</span>
          <MissionStatusBadge status={activeMission.status} />
        </div>
      ) : (
        <DriverPanel empty="No active mission — workflow will appear when assigned." />
      )}

      <ol className="driver-workflow-steps">
        {MISSION_WORKFLOW_STEPS.map((step, idx) => {
          const stepIdx = STATUS_ORDER.indexOf(step.key === 'PATIENT_ONBOARD' ? 'TRANSPORTING' : step.key === 'HANDOVER' ? 'ARRIVED_HOSPITAL' : step.key)
          const done = activeMission && stepIdx <= currentIdx && stepIdx >= 0
          const active = activeMission && step.key !== 'PENDING' && stepIdx === currentIdx
          return (
            <li key={step.key} className={`driver-workflow-step${done ? ' done' : ''}${active ? ' active' : ''}`}>
              <div className="driver-workflow-dot">{done ? '✓' : idx + 1}</div>
              <div>
                <p className="driver-workflow-label">{step.label}</p>
                {active && activeMission?.statusLogs?.length ? (
                  <p className="driver-workflow-time">
                    Last update: {new Date(activeMission.statusLogs[activeMission.statusLogs.length - 1].createdAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      {activeMission && (
        <DriverPanel title="Dispatcher Instructions">
          <p className="driver-note-text">{activeMission.notes || 'Follow standard transport protocol. Contact dispatch for route changes.'}</p>
        </DriverPanel>
      )}
    </div>
  )
}
