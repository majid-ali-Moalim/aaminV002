'use client'

import { useEffect, useState } from 'react'
import { hospitalAppApi } from '@/lib/hospital/hospitalApi'

export default function HospitalProfileView() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    hospitalAppApi.getProfile().then(setData)
  }, [])

  if (!data) return <div className="hosp-loading">Loading profile…</div>

  const h = data.hospital ?? {}
  const a = data.account ?? {}

  return (
    <div className="hosp-stack">
      <section className="hosp-card">
        <h3>Hospital Information</h3>
        <dl className="hosp-dl">
          <div><dt>Name</dt><dd>{h.name}</dd></div>
          <div><dt>Code</dt><dd>{h.hospitalCode}</dd></div>
          <div><dt>Type</dt><dd>{h.hospitalType}</dd></div>
          <div><dt>Region</dt><dd>{h.region?.name ?? '—'}</dd></div>
          <div><dt>Address</dt><dd>{h.address}</dd></div>
        </dl>
      </section>
      <section className="hosp-card">
        <h3>Contact Details</h3>
        <dl className="hosp-dl">
          <div><dt>Primary phone</dt><dd>{h.primaryPhone}</dd></div>
          <div><dt>Short code</dt><dd>{h.emergencyShortCode || '—'}</dd></div>
          <div><dt>Hotline</dt><dd>{h.emergencyHotline || h.emergencyShortCode || '—'}</dd></div>
          <div><dt>Email</dt><dd>{h.email}</dd></div>
        </dl>
      </section>
      <section className="hosp-card">
        <h3>Account</h3>
        <dl className="hosp-dl">
          <div><dt>Username</dt><dd>{a.username}</dd></div>
          <div><dt>Login email</dt><dd>{a.email}</dd></div>
          {a.mustChangePassword && <div><dt>Security</dt><dd className="text-amber-600">Password change required on next login</dd></div>}
        </dl>
      </section>
    </div>
  )
}
