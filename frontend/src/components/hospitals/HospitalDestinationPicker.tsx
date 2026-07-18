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
  hospitalName?: string
  branchId: string
  branchName?: string
  onHospitalChange: (
    hospitalId: string,
    hospitalName: string,
    branchId: string,
    branchName: string,
  ) => void
  hospitalError?: string
  branchError?: string
  required?: boolean
  branchRequired?: boolean
  combobox?: boolean
  hideBranch?: boolean
  hospitalLabel?: string
  hospitalPlaceholder?: string
}

export default function HospitalDestinationPicker({
  hospitals,
  hospitalId,
  hospitalName = '',
  branchId,
  branchName = '',
  onHospitalChange,
  hospitalError,
  branchError,
  required,
  branchRequired = false,
  combobox = false,
  hideBranch = false,
  hospitalLabel = 'Destination Hospital or Place',
  hospitalPlaceholder = 'Type or select hospital or place',
}: Props) {
  const selected = hospitals.find((h) => h.id === hospitalId)
  const branches = useMemo(
    () => (selected ? parseHospitalBranches(selected.branches) : []),
    [selected],
  )

  const displayHospitalName = hospitalName || selected?.name || ''

  const resolveHospitalFromText = (text: string) => {
    const trimmed = text.trim()
    const exact = hospitals.find((h) => h.name.toLowerCase() === trimmed.toLowerCase())
    if (exact) {
      const list = parseHospitalBranches(exact.branches)
      const first = list[0]
      onHospitalChange(exact.id, exact.name, first?.id ?? '', first?.name ?? '')
      return
    }
    onHospitalChange('', trimmed, '', '')
  }

  return (
    <div className={`grid grid-cols-1 ${hideBranch ? '' : 'sm:grid-cols-2'} gap-4`}>
      <div className={hideBranch ? 'sm:col-span-2' : undefined}>
        <FieldLabel required={required} error={hospitalError}>{hospitalLabel}</FieldLabel>
        {combobox ? (
          <>
            <input
              list="destination-hospitals-list"
              className={fieldInputClass(hospitalError)}
              value={displayHospitalName}
              placeholder={hospitalPlaceholder}
              onChange={(e) => resolveHospitalFromText(e.target.value)}
            />
            <datalist id="destination-hospitals-list">
              {hospitals.map((h) => (
                <option key={h.id} value={h.name} />
              ))}
            </datalist>
          </>
        ) : (
          <select
            className={fieldInputClass(hospitalError)}
            value={hospitalId}
            onChange={(e) => {
              const id = e.target.value
              const h = hospitals.find((x) => x.id === id)
              const list = h ? parseHospitalBranches(h.branches) : []
              const first = list[0]
              onHospitalChange(id, h?.name ?? '', first?.id ?? '', first?.name ?? '')
            }}
          >
            <option value="">Select hospital or place</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}
      </div>
      {!hideBranch && (
      <div>
        <FieldLabel
          required={branchRequired && branches.length > 0}
          error={branchError}
        >
          Branch / Location <span className="text-slate-400 font-normal">(optional)</span>
        </FieldLabel>
        {combobox && (!hospitalId || branches.length === 0) ? (
          <input
            className={fieldInputClass(branchError)}
            value={branchName}
            placeholder="Branch or location (optional)"
            onChange={(e) =>
              onHospitalChange(hospitalId, displayHospitalName, '', e.target.value)
            }
          />
        ) : (
          <select
            className={fieldInputClass(branchError)}
            value={branchId}
            disabled={!hospitalId || branches.length === 0}
            onChange={(e) => {
              const b = branches.find((x) => x.id === e.target.value)
              onHospitalChange(
                hospitalId,
                displayHospitalName,
                e.target.value,
                b?.name ?? '',
              )
            }}
          >
            <option value="">{branches.length ? 'Select branch (optional)' : 'No branches registered'}</option>
            {branches.map((b: HospitalBranchRecord) => (
              <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
            ))}
          </select>
        )}
      </div>
      )}
    </div>
  )
}
