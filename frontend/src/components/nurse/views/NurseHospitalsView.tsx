'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Search,
  X,
} from 'lucide-react'
import { hospitalsService, nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { formatSomaliaPhoneDisplay, telHref } from '@/lib/phoneContact'

export type NurseHospitalRow = {
  id: string
  name: string
  hospitalType?: string | null
  hospitalCode?: string | null
  primaryPhone?: string | null
  secondaryPhone?: string | null
  emergencyHotline?: string | null
  emergencyShortCode?: string | null
  contactNumber?: string | null
  emergencyContact?: string | null
  email?: string | null
  address?: string | null
  color?: string | null
  availabilityStatus?: string | null
  acceptEmergencyCases?: boolean
  isActive?: boolean
  region?: { id: string; name: string } | null
  district?: { id: string; name: string } | null
}

const AVATAR_COLORS: Record<string, string> = {
  green: '#059669',
  red: '#dc2626',
  amber: '#d97706',
  yellow: '#ca8a04',
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#7c3aed',
  slate: '#475569',
}

function hospitalInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarColor(hospital: NurseHospitalRow) {
  const key = (hospital.color || 'green').toLowerCase()
  return AVATAR_COLORS[key] || AVATAR_COLORS.green
}

function contactLines(hospital: NurseHospitalRow) {
  const lines: Array<{ label: string; value: string; tel: string | null }> = []
  const add = (label: string, value?: string | null) => {
    const v = value?.trim()
    if (!v) return
    lines.push({ label, value: formatSomaliaPhoneDisplay(v) || v, tel: telHref(v) })
  }
  add('Emergency hotline', hospital.emergencyHotline)
  add('Emergency short code', hospital.emergencyShortCode)
  add('Primary phone', hospital.primaryPhone)
  add('Service line', hospital.contactNumber)
  add('Secondary phone', hospital.secondaryPhone)
  add('Emergency contact', hospital.emergencyContact)
  return lines
}

function hotlinePreview(hospital: NurseHospitalRow) {
  return (
    hospital.emergencyHotline ||
    hospital.emergencyShortCode ||
    hospital.primaryPhone ||
    hospital.contactNumber ||
    '—'
  )
}

export default function NurseHospitalsView() {
  const { nurseId } = useNurseEmployee()
  const [hospitals, setHospitals] = useState<NurseHospitalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState<'all' | 'mine' | string>('all')
  const [myDistrictId, setMyDistrictId] = useState<string | null>(null)
  const [myDistrictName, setMyDistrictName] = useState<string | null>(null)
  const [selected, setSelected] = useState<NurseHospitalRow | null>(null)

  useEffect(() => {
    if (!nurseId) return
    nursesService
      .getById(nurseId)
      .then((profile: { station?: { districtId?: string; district?: { name?: string } } }) => {
        const districtId = profile?.station?.districtId || null
        setMyDistrictId(districtId)
        setMyDistrictName(profile?.station?.district?.name || null)
      })
      .catch(() => {})
  }, [nurseId])

  const loadHospitals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await hospitalsService.getAll()
      setHospitals(Array.isArray(data) ? data.filter((h) => h.isActive !== false) : [])
    } catch {
      setHospitals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHospitals()
  }, [loadHospitals])

  const districts = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of hospitals) {
      if (h.district?.id && h.district.name) map.set(h.district.id, h.district.name)
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [hospitals])

  const filtered = useMemo(() => {
    let rows = hospitals
    if (districtFilter === 'mine' && myDistrictId) {
      rows = rows.filter((h) => h.district?.id === myDistrictId)
    } else if (districtFilter !== 'all') {
      rows = rows.filter((h) => h.district?.id === districtFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((h) =>
        `${h.name} ${h.address || ''} ${h.district?.name || ''} ${h.region?.name || ''}`
          .toLowerCase()
          .includes(q),
      )
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }, [hospitals, districtFilter, myDistrictId, search])

  return (
    <div className="nurse-hospitals">
      <div className="nurse-hospitals-toolbar">
        <div className="nurse-hospitals-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search hospitals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="nurse-hospitals-filter">
          <Filter size={14} />
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value as typeof districtFilter)}
          >
            <option value="all">All districts</option>
            {myDistrictId && (
              <option value="mine">
                My district{myDistrictName ? ` (${myDistrictName})` : ''}
              </option>
            )}
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="nurse-loading-inline">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading hospitals…</span>
        </div>
      ) : filtered.length === 0 ? (
        <p className="nurse-empty-inline">No hospitals match your filters.</p>
      ) : (
        <ul className="nurse-hospitals-list">
          {filtered.map((hospital) => {
            const hotline = hotlinePreview(hospital)
            const tel = telHref(
              hospital.emergencyHotline ||
                hospital.primaryPhone ||
                hospital.contactNumber ||
                hospital.emergencyShortCode,
            )
            return (
              <li key={hospital.id}>
                <button
                  type="button"
                  className="nurse-hospital-card"
                  onClick={() => setSelected(hospital)}
                >
                  <div
                    className="nurse-hospital-avatar"
                    style={{ background: avatarColor(hospital) }}
                    aria-hidden
                  >
                    {hospitalInitials(hospital.name)}
                  </div>
                  <div className="nurse-hospital-card-body">
                    <p className="nurse-hospital-name">{hospital.name}</p>
                    <p className="nurse-hospital-meta">
                      {[hospital.district?.name, hospital.region?.name].filter(Boolean).join(' · ') ||
                        'Location not set'}
                    </p>
                    <p className="nurse-hospital-hotline">
                      <Phone size={12} />
                      {formatSomaliaPhoneDisplay(String(hotline)) || hotline}
                    </p>
                  </div>
                  {tel && (
                    <a
                      href={tel}
                      className="nurse-hospital-call-btn"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Call ${hospital.name}`}
                    >
                      <Phone size={16} />
                      Call
                    </a>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected && (
        <div className="nurse-hospital-detail-backdrop" onClick={() => setSelected(null)}>
          <div
            className="nurse-hospital-detail"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nurse-hospital-detail-title"
          >
            <div className="nurse-hospital-detail-head">
              <div
                className="nurse-hospital-avatar nurse-hospital-avatar--lg"
                style={{ background: avatarColor(selected) }}
              >
                {hospitalInitials(selected.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="nurse-hospital-detail-title">{selected.name}</h3>
                <p className="nurse-hospital-detail-sub">
                  {selected.hospitalType || 'Hospital'}
                  {selected.hospitalCode ? ` · ${selected.hospitalCode}` : ''}
                </p>
              </div>
              <button type="button" className="nurse-hospital-detail-close" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="nurse-hospital-detail-grid">
              <div>
                <span className="label">Area / district</span>
                <p>
                  {[selected.district?.name, selected.region?.name].filter(Boolean).join(', ') ||
                    '—'}
                </p>
              </div>
              <div>
                <span className="label">Address</span>
                <p>{selected.address || '—'}</p>
              </div>
              <div>
                <span className="label">Availability</span>
                <p>{selected.availabilityStatus || '—'}</p>
              </div>
              <div>
                <span className="label">Emergency cases</span>
                <p>{selected.acceptEmergencyCases ? 'Accepted' : 'Not listed for emergency'}</p>
              </div>
            </div>

            <div className="nurse-hospital-contacts">
              <h4>
                <Phone size={14} /> Contact numbers
              </h4>
              {contactLines(selected).length === 0 ? (
                <p className="nurse-empty-inline">No phone numbers on file.</p>
              ) : (
                <ul>
                  {contactLines(selected).map((line) => (
                    <li key={line.label}>
                      <span className="contact-label">{line.label}</span>
                      {line.tel ? (
                        <a href={line.tel} className="contact-call">
                          {line.value}
                        </a>
                      ) : (
                        <span>{line.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected.address && (
              <p className="nurse-hospital-location-note">
                <MapPin size={14} /> {selected.address}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
