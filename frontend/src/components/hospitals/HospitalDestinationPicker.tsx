'use client'

import { useMemo } from 'react'
import { parseHospitalBranches, type HospitalBranchRecord } from '@/lib/hospital-coordination/constants'
import { FieldLabel, fieldInputClass } from '@/components/features/emergency/dispatch-create/ui'

export type HospitalOption = {
  id: string
  name: string
  branches?: unknown
}

type Props = {
  hospitals: HospitalOption[]
  hospitalId: string
  branchId: string
  onHospitalChange: (hospitalId: string, branchId: string, branchName: string) => void
  hospitalError?: string
  branchError?: string
  required?: boolean
}

export default function HospitalDestinationPicker({
  hospitals,
  hospitalId,
  branchId,
  onHospitalChange,
  hospitalError,
  branchError,
  required,
}: Props) {
  const selected = hospitals.find((h) => h.id === hospitalId)
  const branches = useMemo(
    () => (selected ? parseHospitalBranches(selected.branches) : []),
    [selected],
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <FieldLabel required={required} error={hospitalError}>Destination Hospital</FieldLabel>
        <select
          className={fieldInputClass(hospitalError)}
          value={hospitalId}
          onChange={(e) => {
            const id = e.target.value
            const h = hospitals.find((x) => x.id === id)
            const list = h ? parseHospitalBranches(h.branches) : []
            const first = list[0]
            onHospitalChange(id, first?.id ?? '', first?.name ?? '')
          }}
        >
          <option value="">Select hospital</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel required={required && branches.length > 0} error={branchError}>Branch / Location</FieldLabel>
        <select
          className={fieldInputClass(branchError)}
          value={branchId}
          disabled={!hospitalId || branches.length === 0}
          onChange={(e) => {
            const b = branches.find((x) => x.id === e.target.value)
            onHospitalChange(hospitalId, e.target.value, b?.name ?? '')
          }}
        >
          <option value="">{branches.length ? 'Select branch' : 'No branches registered'}</option>
          {branches.map((b: HospitalBranchRecord) => (
            <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
