'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'

export default function NurseShiftsView() {
  const { nurseId, shiftStatus, fullName, employeeCode } = useNurseEmployee()
  const [status, setStatus] = useState(shiftStatus || 'OFF_DUTY')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!nurseId) return
    nursesService.getById(nurseId).then(setProfile).catch(() => {})
  }, [nurseId])

  useEffect(() => {
    if (shiftStatus) setStatus(shiftStatus)
  }, [shiftStatus])

  const updateShift = async (next: string) => {
    if (!nurseId) return
    setLoading(true)
    try {
      await nursesService.updateShift(nurseId, next)
      setStatus(next)
      toast.success(`Shift status: ${next.replace(/_/g, ' ')}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update shift')
    } finally {
      setLoading(false)
    }
  }

  const onDuty = status === 'ON_DUTY' || status === 'AVAILABLE'

  return (
    <div className="space-y-4">
      <div className="nurse-shift-hero">
        <Clock size={28} className="text-red-400" />
        <div>
          <h2 className="text-lg font-bold text-white">{fullName}</h2>
          <p className="text-sm text-zinc-400">{employeeCode} · {status.replace(/_/g, ' ')}</p>
        </div>
        <span className={`nurse-shift-badge ${onDuty ? 'on' : 'off'}`}>
          {onDuty ? 'Available for missions' : 'Off duty'}
        </span>
      </div>

      <div className="nurse-shift-actions">
        <button
          type="button"
          className="nurse-btn primary"
          disabled={loading || status === 'ON_DUTY'}
          onClick={() => updateShift('ON_DUTY')}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
          Clock In
        </button>
        <button
          type="button"
          className="nurse-btn ghost"
          disabled={loading || status === 'OFF_DUTY'}
          onClick={() => updateShift('OFF_DUTY')}
        >
          <LogOut size={18} />
          Clock Out
        </button>
        <button
          type="button"
          className="nurse-btn ghost"
          disabled={loading}
          onClick={() => updateShift('AVAILABLE')}
        >
          Set Available
        </button>
      </div>

      {profile?.assignedAmbulance && (
        <div className="nurse-form-card">
          <h3 className="font-bold text-white mb-2">Assigned Ambulance</h3>
          <p className="text-zinc-300">{profile.assignedAmbulance.ambulanceNumber}</p>
          <p className="text-sm text-zinc-500">{profile.assignedAmbulance.plateNumber}</p>
        </div>
      )}
    </div>
  )
}
