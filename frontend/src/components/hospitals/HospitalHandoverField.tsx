'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseHospitalBranches } from '@/lib/hospital-coordination/constants'
import type { RejectedHospitalEntry } from '@/lib/emergency/buildCaseClosureDefaults'
import type { HospitalOption } from '@/components/hospitals/HospitalDestinationPicker'

const CUSTOM_BRANCH = '__custom_branch__'

type Props = {
  hospitals: HospitalOption[]
  entry: RejectedHospitalEntry
  onChange: (patch: Partial<RejectedHospitalEntry>) => void
  readOnly?: boolean
  index: number
}

function refusalReasonLabel(value: string, options: { value: string; label: string }[]) {
  return options.find((o) => o.value === value)?.label || value || '—'
}

export function HospitalHandoverField({
  hospitals,
  entry,
  onChange,
  readOnly = false,
  index,
  refusalOptions,
}: Props & { refusalOptions: { value: string; label: string }[] }) {
  const selected = hospitals.find((h) => h.id === entry.hospitalId)
  const branches = useMemo(
    () => (selected ? parseHospitalBranches(selected.branches) : []),
    [selected],
  )
  const [hospitalDraft, setHospitalDraft] = useState(entry.hospitalName)
  const [customMode, setCustomMode] = useState(!entry.hospitalId && Boolean(entry.hospitalName))

  useEffect(() => {
    setHospitalDraft(entry.hospitalName)
  }, [entry.hospitalName, entry.hospitalId])

  const commitHospital = (text: string) => {
    const trimmed = text.trim()
    const match = hospitals.find((h) => h.name.toLowerCase() === trimmed.toLowerCase())
    if (match) {
      const list = parseHospitalBranches(match.branches)
      const first = list[0]
      onChange({
        hospitalId: match.id,
        hospitalName: match.name,
        branchId: first?.id,
        branchName: first?.name,
        location: first?.address,
        phone: entry.phone,
      })
      setCustomMode(false)
      return
    }
    onChange({
      hospitalId: undefined,
      hospitalName: text,
      branchId: undefined,
      branchName: entry.branchName,
    })
    setCustomMode(true)
  }

  if (readOnly) {
    return (
      <div className="nmw-rejected-card">
        <div className="nmw-rejected-card-head">
          <span>Rejected hospital #{index + 1}</span>
        </div>
        <label className="span-2">
          Hospital
          <input value={entry.hospitalName || '—'} readOnly className="readonly" />
        </label>
        {entry.branchName && (
          <label>
            Branch
            <input value={entry.branchName} readOnly className="readonly" />
          </label>
        )}
        {entry.location && (
          <label>
            Location
            <input value={entry.location} readOnly className="readonly" />
          </label>
        )}
        {entry.phone && (
          <label>
            Phone
            <input value={entry.phone} readOnly className="readonly" />
          </label>
        )}
        <label>
          Refusal reason
          <input value={refusalReasonLabel(entry.reason, refusalOptions)} readOnly className="readonly" />
        </label>
        <label>
          Notes
          <input value={entry.notes || '—'} readOnly className="readonly" />
        </label>
      </div>
    )
  }

  return (
    <div className="nmw-rejected-card">
      <div className="nmw-rejected-card-head">
        <span>Rejected hospital #{index + 1}</span>
      </div>
      <label className="span-2">
        Hospital
        <input
          list={`handover-hospitals-${entry.id}`}
          value={hospitalDraft}
          onChange={(e) => setHospitalDraft(e.target.value)}
          onBlur={() => commitHospital(hospitalDraft)}
          placeholder="Select or type hospital name"
          maxLength={120}
        />
        <datalist id={`handover-hospitals-${entry.id}`}>
          {hospitals.map((h) => (
            <option key={h.id} value={h.name} />
          ))}
        </datalist>
      </label>
      {entry.hospitalId && branches.length > 0 && !customMode ? (
        <label>
          Branch
          <select
            value={entry.branchId || ''}
            onChange={(e) => {
              if (e.target.value === CUSTOM_BRANCH) {
                onChange({ branchId: undefined })
                return
              }
              const b = branches.find((x) => x.id === e.target.value)
              onChange({
                branchId: e.target.value,
                branchName: b?.name,
                location: b?.address,
              })
            }}
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            <option value={CUSTOM_BRANCH}>Custom branch…</option>
          </select>
        </label>
      ) : (
        <label>
          Branch / location
          <input
            value={entry.branchName || ''}
            onChange={(e) => onChange({ branchName: e.target.value, branchId: undefined })}
            placeholder="Branch or location"
            maxLength={120}
          />
        </label>
      )}
      {customMode && (
        <>
          <label>
            Location
            <input
              value={entry.location || ''}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="Address or area"
              maxLength={200}
            />
          </label>
          <label>
            Phone
            <input
              value={entry.phone || ''}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="Hospital phone"
              maxLength={20}
            />
          </label>
        </>
      )}
      <label>
        Refusal reason
        <select value={entry.reason} onChange={(e) => onChange({ reason: e.target.value })}>
          {refusalOptions.map((opt) => (
            <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Notes
        <input
          value={entry.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          maxLength={2000}
          placeholder="Optional details"
        />
      </label>
    </div>
  )
}
