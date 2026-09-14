'use client'

import { useEffect, useMemo, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { parseHospitalBranches, type HospitalBranchRecord } from '@/lib/hospital-coordination/constants'
import { FieldLabel, fieldInputClass } from '@/components/features/emergency/dispatch-create/ui'
import { CustomHospitalModal, type CustomHospitalDraft } from '@/components/hospitals/CustomHospitalModal'

export type HospitalOption = {
  id: string
  name: string
  branches?: unknown
}

const CUSTOM_BRANCH = '__custom_branch__'

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
  allowCustomBranch?: boolean
  /**
   * When provided, shows an "Add custom hospital" button that creates a real
   * hospital record (editable later in Hospital Coordination) and selects it.
   * Should return the created hospital option, or null on failure.
   */
  onCreateCustomHospital?: (draft: CustomHospitalDraft) => Promise<HospitalOption | null>
  /** Stacked labels/inputs for nurse handover (dark embedded forms) */
  variant?: 'default' | 'embedded'
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
  allowCustomBranch = true,
  onCreateCustomHospital,
  variant = 'default',
}: Props) {
  const embedded = variant === 'embedded'
  const [localHospitals, setLocalHospitals] = useState<HospitalOption[]>([])

  const allHospitals = useMemo(() => {
    const byId = new Map<string, HospitalOption>()
    for (const h of hospitals) byId.set(h.id, h)
    for (const h of localHospitals) byId.set(h.id, h)
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [hospitals, localHospitals])

  const selected = allHospitals.find((h) => h.id === hospitalId)
  const branches = useMemo(
    () => (selected ? parseHospitalBranches(selected.branches) : []),
    [selected],
  )

  const [customModalOpen, setCustomModalOpen] = useState(false)
  const displayHospitalName = hospitalName || selected?.name || ''
  const [hospitalDraft, setHospitalDraft] = useState(displayHospitalName)
  const [branchDraft, setBranchDraft] = useState(branchName)
  const [customBranchMode, setCustomBranchMode] = useState(
    () => allowCustomBranch && Boolean(branchName) && !branchId && Boolean(hospitalId),
  )

  useEffect(() => {
    setHospitalDraft(displayHospitalName)
  }, [displayHospitalName, hospitalId])

  useEffect(() => {
    setBranchDraft(branchName)
    if (branchId) setCustomBranchMode(false)
    else if (allowCustomBranch && branchName && hospitalId) setCustomBranchMode(true)
  }, [branchName, branchId, hospitalId, allowCustomBranch])

  const commitHospitalDraft = (text: string) => {
    const trimmed = text.trim()
    const exact = allHospitals.find((h) => h.name.toLowerCase() === trimmed.toLowerCase())
    if (exact) {
      const list = parseHospitalBranches(exact.branches)
      const first = list[0]
      onHospitalChange(exact.id, exact.name, first?.id ?? '', first?.name ?? '')
      setCustomBranchMode(false)
      return
    }
    onHospitalChange('', text, '', '')
    setCustomBranchMode(true)
  }

  const handleCreateCustom = async (draft: CustomHospitalDraft) => {
    if (!onCreateCustomHospital) return
    const created = await onCreateCustomHospital(draft)
    if (!created) throw new Error('Failed to create hospital')
    setLocalHospitals((prev) => [created, ...prev.filter((h) => h.id !== created.id)])
    const list = parseHospitalBranches(created.branches)
    const first = list[0]
    setHospitalDraft(created.name)
    setBranchDraft(first?.name ?? draft.branchName.trim())
    setCustomBranchMode(false)
    onHospitalChange(created.id, created.name, first?.id ?? '', first?.name ?? '')
  }

  const handleBranchSelect = (value: string) => {
    if (value === CUSTOM_BRANCH) {
      setCustomBranchMode(true)
      onHospitalChange(hospitalId, displayHospitalName, '', branchDraft)
      return
    }
    setCustomBranchMode(false)
    const b = branches.find((x) => x.id === value)
    onHospitalChange(hospitalId, displayHospitalName, value, b?.name ?? '')
  }

  const hospitalField = combobox ? (
    <>
      <input
        list="destination-hospitals-list"
        className={embedded ? undefined : fieldInputClass(hospitalError)}
        value={hospitalDraft}
        placeholder={hospitalPlaceholder}
        onChange={(e) => setHospitalDraft(e.target.value)}
        onBlur={() => commitHospitalDraft(hospitalDraft)}
        aria-invalid={Boolean(hospitalError)}
      />
      <datalist id="destination-hospitals-list">
        {allHospitals.map((h) => (
          <option key={h.id} value={h.name} />
        ))}
      </datalist>
      <p className={embedded ? 'nmw-field-hint' : 'text-[11px] text-slate-400 mt-1'}>
        Select from the list or type a custom hospital name (spaces allowed).
      </p>
    </>
  ) : (
    <>
      <select
        className={embedded ? undefined : fieldInputClass(hospitalError)}
        value={hospitalId || (hospitalName ? '__custom__' : '')}
        onChange={(e) => {
          const id = e.target.value
          if (id === '__custom__') {
            onHospitalChange('', hospitalDraft || '', '', '')
            return
          }
          const h = allHospitals.find((x) => x.id === id)
          const list = h ? parseHospitalBranches(h.branches) : []
          const first = list[0]
          onHospitalChange(id, h?.name ?? '', first?.id ?? '', first?.name ?? '')
          setCustomBranchMode(false)
        }}
        aria-invalid={Boolean(hospitalError)}
      >
        <option value="">Select hospital or place</option>
        {allHospitals.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
        <option value="__custom__">Custom hospital (type name below)</option>
      </select>
      {!combobox && (!hospitalId || hospitalId === '') && (
        <input
          className={embedded ? undefined : `${fieldInputClass()} mt-2`}
          value={hospitalDraft}
          placeholder="Custom hospital name"
          onChange={(e) => {
            setHospitalDraft(e.target.value)
            onHospitalChange('', e.target.value, branchId, branchName)
          }}
        />
      )}
    </>
  )

  const customHospitalButton = onCreateCustomHospital ? (
    <button
      type="button"
      onClick={() => setCustomModalOpen(true)}
      className={
        embedded
          ? 'nmw-hospital-picker-add-btn'
          : 'mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800'
      }
    >
      <PlusCircle className="w-4 h-4 shrink-0" />
      Add custom hospital &amp; branch
    </button>
  ) : null

  const branchField = !hideBranch ? (
    hospitalId && branches.length > 0 && !customBranchMode ? (
      <>
        <select
          className={embedded ? undefined : fieldInputClass(branchError)}
          value={branchId || ''}
          onChange={(e) => handleBranchSelect(e.target.value)}
          aria-invalid={Boolean(branchError)}
        >
          <option value="">Select branch (optional)</option>
          {branches.map((b: HospitalBranchRecord) => (
            <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
          ))}
          {allowCustomBranch && (
            <option value={CUSTOM_BRANCH}>Custom branch / location…</option>
          )}
        </select>
      </>
    ) : (
      <>
        <input
          className={embedded ? undefined : fieldInputClass(branchError)}
          value={branchDraft}
          placeholder="Branch or location (optional)"
          onChange={(e) => {
            setBranchDraft(e.target.value)
            onHospitalChange(hospitalId, displayHospitalName || hospitalDraft, '', e.target.value)
          }}
          aria-invalid={Boolean(branchError)}
        />
        {hospitalId && branches.length > 0 && customBranchMode && allowCustomBranch && (
          <button
            type="button"
            className={embedded ? 'nmw-hospital-picker-link' : 'text-xs text-teal-700 font-semibold mt-1 underline'}
            onClick={() => {
              setCustomBranchMode(false)
              const first = branches[0]
              if (first) onHospitalChange(hospitalId, displayHospitalName, first.id, first.name)
            }}
          >
            Use registered branch instead
          </button>
        )}
      </>
    )
  ) : null

  const customHospitalModal = onCreateCustomHospital ? (
    <CustomHospitalModal
      open={customModalOpen}
      onClose={() => setCustomModalOpen(false)}
      onCreate={handleCreateCustom}
    />
  ) : null

  if (embedded) {
    return (
      <>
        <div className="nmw-hospital-picker">
          <label>
            {hospitalLabel}
            {hospitalField}
            {hospitalError ? <span className="nurse-field-error">{hospitalError}</span> : null}
          </label>
          {!hideBranch && (
            <label>
              Branch / Location <span className="nmw-optional">(optional)</span>
              {branchField}
              {branchError ? <span className="nurse-field-error">{branchError}</span> : null}
            </label>
          )}
          {customHospitalButton}
        </div>
        {customHospitalModal}
      </>
    )
  }

  return (
    <div className={`grid grid-cols-1 ${hideBranch ? '' : 'sm:grid-cols-2'} gap-4`}>
      <div className={hideBranch ? 'sm:col-span-2' : undefined}>
        <FieldLabel required={required} error={hospitalError}>{hospitalLabel}</FieldLabel>
        {hospitalField}
        {customHospitalButton}
      </div>
      {!hideBranch && (
        <div>
          <FieldLabel
            required={branchRequired && branches.length > 0}
            error={branchError}
          >
            Branch / Location <span className="text-slate-400 font-normal">(optional)</span>
          </FieldLabel>
          {branchField}
        </div>
      )}
      {customHospitalModal}
    </div>
  )
}
