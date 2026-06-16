'use client'

import { useEffect, useState } from 'react'
import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

export default function HospitalReportsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    hospitalAppApi.getReports().then(setData).catch(() => {})
  }, [])

  return (
    <HospitalPageLayout title="Reports" subtitle="Case volume, acceptance rates, and capacity utilization">
      <div className="hosp-kpi-grid">
        <div className="hosp-kpi"><span className="hosp-kpi-value">{data?.kpis?.casesReceived ?? '—'}</span><span className="hosp-kpi-label">Total Cases</span></div>
        <div className="hosp-kpi"><span className="hosp-kpi-value">{data?.kpis?.casesAccepted ?? '—'}</span><span className="hosp-kpi-label">Accepted</span></div>
        <div className="hosp-kpi"><span className="hosp-kpi-value">{data?.kpis?.casesRefused ?? '—'}</span><span className="hosp-kpi-label">Rejected</span></div>
        <div className="hosp-kpi"><span className="hosp-kpi-value">{data?.kpis?.avgHandoverTimeMins ?? '—'}</span><span className="hosp-kpi-label">Avg Handover (min)</span></div>
      </div>
      <p className="text-sm text-slate-500 mt-4">Export PDF / Excel / CSV — connect to reports module for full export.</p>
    </HospitalPageLayout>
  )
}
