'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { driverShiftApi } from '@/lib/driverApi'
import { Clock, Calendar, ShieldAlert, Award, Coffee, LogOut, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface AttendanceRecord {
  id: string
  date: string
  shiftType: string
  status: string
  clockIn: string
  clockOut: string | null
  hoursWorked: string
}

export default function DriverShiftPage() {
  const router = useRouter()
  const { isAuthenticated, profile, setProfile } = useDriverStore()
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([
    { id: '1', date: 'May 30, 2026', shiftType: 'Morning (06:00 - 14:00)', status: 'Present', clockIn: '05:54 AM', clockOut: '14:02 PM', hoursWorked: '8h 8m' },
    { id: '2', date: 'May 29, 2026', shiftType: 'Morning (06:00 - 14:00)', status: 'Present', clockIn: '05:58 AM', clockOut: '14:05 PM', hoursWorked: '8h 7m' },
    { id: '3', date: 'May 28, 2026', shiftType: 'Morning (06:00 - 14:00)', status: 'Late', clockIn: '06:15 AM', clockOut: '14:00 PM', hoursWorked: '7h 45m' },
  ])

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  const shiftStatus = profile?.shiftStatus || 'OFF_DUTY'

  const handleClockIn = async () => {
    setLoading(true)
    try {
      await driverShiftApi.start()
      if (profile) {
        setProfile({ ...profile, shiftStatus: 'ON_DUTY' })
      }
      toast.success('Clocked in successfully!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Clock in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out? This ends your current shift.')) return
    setLoading(true)
    try {
      await driverShiftApi.end()
      if (profile) {
        setProfile({ ...profile, shiftStatus: 'OFF_DUTY' })
      }
      toast.success('Clocked out successfully!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Clock out failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSetBreak = async () => {
    setLoading(true)
    try {
      const nextStatus = shiftStatus === 'ON_BREAK' ? 'ON_DUTY' : 'ON_BREAK'
      await driverShiftApi.setAvailability(nextStatus === 'ON_DUTY')
      if (profile) {
        setProfile({ ...profile, shiftStatus: nextStatus })
      }
      toast.success(nextStatus === 'ON_BREAK' ? 'Status set to Break' : 'Status set to On Duty')
    } catch (err: any) {
      toast.error('Failed to toggle break status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DriverPageLayout title="Shift & Attendance">
      <DriverModuleShell module={getModuleById('shifts')!} description="Clock in/out, view schedule, and manage breaks.">
        {/* Active Shift Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Shift Console</h3>
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                shiftStatus === 'ON_DUTY'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-900'
                  : shiftStatus === 'ON_BREAK'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-900'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {shiftStatus.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Shift Type</p>
              <p className="text-xs font-bold text-white mt-1">Morning (06:00 - 14:00)</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Today's Date</p>
              <p className="text-xs font-bold text-white mt-1">{format(new Date(), 'EEE, MMM d, yyyy')}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {shiftStatus === 'OFF_DUTY' || shiftStatus === 'AVAILABLE' ? (
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Clock In (Start Shift)
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSetBreak}
                  disabled={loading}
                  className={`h-12 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                    shiftStatus === 'ON_BREAK'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-amber-600 text-white hover:bg-amber-500'
                  }`}
                >
                  <Coffee size={16} />
                  {shiftStatus === 'ON_BREAK' ? 'End Break' : 'Take Break'}
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="h-12 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  Clock Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Shift History Logs */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            Attendance History
          </h3>

          <div className="space-y-2">
            {attendance.map((record) => (
              <div
                key={record.id}
                className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-zinc-800 transition-all"
              >
                <div className="space-y-1">
                  <p className="text-xs font-black text-white">{record.date}</p>
                  <p className="text-[10px] text-zinc-500 font-bold">{record.shiftType}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-zinc-400">
                    <span>In: {record.clockIn}</span>
                    <span>·</span>
                    <span>Out: {record.clockOut || '—'}</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      record.status === 'Present'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'
                        : 'bg-amber-950/50 text-amber-400 border-amber-900/50'
                    }`}
                  >
                    {record.status}
                  </span>
                  <p className="text-xs font-black text-white mt-1">{record.hoursWorked}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
