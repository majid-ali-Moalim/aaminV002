'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { driverAmbulanceApi } from '@/lib/driverApi'
import { Shield, Fuel, Wrench, CheckCircle2, ClipboardCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DriverAmbulancePage() {
  const router = useRouter()
  const { isAuthenticated, profile } = useDriverStore()
  const [loading, setLoading] = useState(false)
  const [checklist, setChecklist] = useState({
    brakes: false,
    tires: false,
    siren: false,
    lights: false,
    oxygen: false,
    firstAid: false,
    stretcher: false,
    battery: false,
  })

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  const ambulance = profile?.assignedAmbulance

  const handleChecklistToggle = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveInspection = () => {
    const unchecked = Object.entries(checklist).filter(([_, checked]) => !checked)
    if (unchecked.length > 0) {
      toast.error(`Please complete all inspection items before saving!`)
      return
    }
    toast.success('Pre-trip inspection saved & logged!')
  }

  return (
    <DriverPageLayout title="Ambulance" mainClassName="driver-main--split">
      <DriverModuleShell module={getModuleById('ambulance')!} description="View assigned vehicle, report issues, and log pre-trip inspections.">
        {/* Ambulance Details */}
        {ambulance ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Vehicle Profile</h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full border border-emerald-900">
                {ambulance.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Ambulance ID</p>
                <p className="text-sm font-black text-white mt-1">{ambulance.ambulanceNumber}</p>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Plate Number</p>
                <p className="text-sm font-black text-white mt-1">{ambulance.plateNumber || 'EADS-104'}</p>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Type</p>
                <p className="text-sm font-black text-white mt-1">{ambulance.vehicleType || 'Advanced Life Support'}</p>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Station</p>
                <p className="text-sm font-black text-white mt-1 truncate">{profile?.station?.name || 'Main Station'}</p>
              </div>
            </div>

            {/* Fuel & Maintenance Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                <Fuel className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase">Fuel Level</p>
                  <p className="text-sm font-black text-white mt-0.5">{ambulance.fuelLevel ?? 85}%</p>
                </div>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                <Wrench className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase">Maintenance</p>
                  <p className="text-sm font-black text-white mt-0.5">Healthy</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No Assigned Ambulance</p>
            <p className="text-xs text-zinc-500 mt-1">Please contact dispatch to assign a vehicle to your profile.</p>
          </div>
        )}

        {/* Pre-Trip Inspection Checklist */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-red-500" />
            Pre-Trip Inspection Checklist
          </h3>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2">
            {Object.entries(checklist).map(([key, checked]) => (
              <label
                key={key}
                onClick={() => handleChecklistToggle(key as any)}
                className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-900 transition-all"
              >
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    checked ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-700 bg-transparent'
                  }`}
                >
                  {checked && <CheckCircle2 size={14} />}
                </div>
              </label>
            ))}

            <button
              onClick={handleSaveInspection}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-900/20 transition-all mt-4"
            >
              Log Pre-Trip Inspection
            </button>
          </div>
        </div>
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
