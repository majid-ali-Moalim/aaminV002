'use client'

import { AGE_GROUPS } from '@/components/public/hire-ambulance/constants'
import { Gender } from '@/types'
import { FieldLabel, fieldInputClass } from './ui'

type Props = {
  ageGroup: string
  gender: string
  ageGroupError?: string
  genderError?: string
  onChange: (patch: { ageGroup?: string; gender?: string }) => void
}

export default function PatientDemographicsFields({
  ageGroup,
  gender,
  ageGroupError,
  genderError,
  onChange,
}: Props) {
  return (
    <>
      <div>
        <FieldLabel required error={ageGroupError}>Age Group</FieldLabel>
        <select
          className={fieldInputClass(ageGroupError)}
          value={ageGroup}
          onChange={(e) => onChange({ ageGroup: e.target.value })}
        >
          <option value="">Select age group</option>
          {AGE_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel required error={genderError}>Gender</FieldLabel>
        <select
          className={fieldInputClass(genderError)}
          value={gender}
          onChange={(e) => onChange({ gender: e.target.value })}
        >
          <option value="">Select gender</option>
          <option value={Gender.MALE}>Male</option>
          <option value={Gender.FEMALE}>Female</option>
        </select>
      </div>
    </>
  )
}
