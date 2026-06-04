'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Activity, HeartPulse } from 'lucide-react'

export default function NurseDashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const name =
    user?.employee?.employeeRole?.name ||
    (user as { firstName?: string })?.firstName ||
    user?.username ||
    'Nurse'

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/15">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div>
            <p className="text-red-100 text-sm font-medium">{greeting}</p>
            <h1 className="text-2xl font-black mt-1">Nurse Command Center</h1>
            <p className="text-red-100 mt-2 text-sm">
              Welcome, {name}. Patient care, records, and mission tools are available from the sidebar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Patient Care', href: '/nurse/patients', icon: HeartPulse },
          { label: 'Medical Records', href: '/nurse/records', icon: Activity },
          { label: 'Schedule', href: '/nurse/schedule', icon: Activity },
        ].map((item) => (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-red-200 hover:shadow-md transition-all"
          >
            <item.icon className="w-6 h-6 text-red-600 mb-2" />
            <p className="font-bold text-slate-800">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
