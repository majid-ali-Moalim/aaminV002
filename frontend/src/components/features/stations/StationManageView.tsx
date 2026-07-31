'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MdmEntityPage from '@/components/master-data/MdmEntityPage'

export default function StationManageView() {
  const searchParams = useSearchParams()
  const autoOpenCreate = searchParams.get('add') === '1'
  const [createSignal, setCreateSignal] = useState(0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">Station registry</p>
          <h1 className="text-2xl font-black text-slate-900">Manage Stations</h1>
          <p className="text-sm text-slate-500 mt-1">
            New stations use the full form: code, home district, coverage districts, address, phone, and description.
          </p>
        </div>
        <Button
          className="rounded-xl h-11 shrink-0"
          onClick={() => setCreateSignal((n) => n + 1)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Station
        </Button>
      </div>

      <MdmEntityPage
        entityKey="stations"
        autoOpenCreate={autoOpenCreate}
        openCreateSignal={createSignal}
      />
    </div>
  )
}
