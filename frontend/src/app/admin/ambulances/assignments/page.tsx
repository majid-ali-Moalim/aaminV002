'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shuffle, Truck, Building2, Loader2, Info, ArrowRight } from 'lucide-react'
import { ambulancesService } from '@/lib/api'
import { Ambulance } from '@/types'
import { Button } from '@/components/ui/button'

export default function FleetAssignmentsPage() {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ambulancesService
      .getAll()
      .then(setAmbulances)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
          <Shuffle className="w-96 h-96 absolute -top-20 -right-20 text-white rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400 border border-blue-500/20">
              <Info className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">
              Dispatch-only crew
            </span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Fleet crew assignment
          </h1>
          <p className="text-white/60 text-sm mt-3 font-medium max-w-2xl leading-relaxed">
            Ambulances no longer carry a permanent driver or nurse. Crew is linked when you assign a
            case from the dispatch <span className="text-white font-semibold">Assign Team</span>{' '}
            form. Use the ambulance registry to update station, vehicle, and equipment details.
          </p>
          <Link href="/admin/ambulances" className="inline-block mt-6">
            <Button className="rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold">
              Manage ambulances
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Loading fleet…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {ambulances.map((amb) => (
            <div
              key={amb.id}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8"
            >
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-gray-50 rounded-3xl flex items-center justify-center border border-gray-100">
                  <Truck className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-secondary tracking-tight uppercase">
                    {amb.ambulanceNumber}
                  </h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {amb.plateNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Station
                  </span>
                </div>
                <span className="text-xs font-black text-secondary uppercase tracking-tight">
                  {amb.station?.name || 'Not set'}
                </span>
              </div>
              <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                Status: <span className="font-semibold text-gray-700">{amb.status}</span>
                {' · '}
                Crew assigned per dispatch case only.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
