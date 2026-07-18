'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { driverMissionsApi } from '@/lib/driverApi'
import { FieldCaseDetailModal, type FieldCaseDetail } from '@/components/shared/FieldCaseDetailModal'

type Props = {
  missionId: string | null
  open: boolean
  onClose: () => void
  onAccept?: (missionId: string) => void
  onReject?: (missionId: string) => void
  showAccept?: boolean
}

export default function DriverMissionDetailModal({
  missionId,
  open,
  onClose,
  onAccept,
  onReject,
  showAccept = false,
}: Props) {
  const [mission, setMission] = useState<FieldCaseDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !missionId) return
    setLoading(true)
    setMission(null)
    driverMissionsApi
      .getById(missionId)
      .then((data) => setMission(data as FieldCaseDetail))
      .catch(() => toast.error('Could not load case details'))
      .finally(() => setLoading(false))
  }, [open, missionId])

  const acceptFooter =
    mission && showAccept && mission.status === 'ASSIGNED' && onAccept ? (
      <>
        {onReject && (
          <button
            type="button"
            className="driver-btn-sm ghost flex-1 text-red-500 border-red-200"
            onClick={() => onReject(mission.id)}
          >
            Reject
          </button>
        )}
        <button
          type="button"
          className="driver-btn-sm primary flex-1"
          onClick={() => onAccept(mission.id)}
        >
          Accept Assignment
        </button>
      </>
    ) : null

  return (
    <FieldCaseDetailModal
      open={open && Boolean(missionId)}
      onClose={onClose}
      caseData={mission}
      loading={loading}
      variant="driver"
      footerExtra={acceptFooter}
    />
  )
}
