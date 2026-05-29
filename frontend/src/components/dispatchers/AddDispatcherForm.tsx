'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Lock,
  Save,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Building2,
  Radio,
  Shield,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SectionHeader,
  TacticalBadge,
  FormInput,
  FormSelect,
  FormCheckbox,
  FileUploadCard,
} from '@/components/nurses/NurseFormSections'
import {
  fetchDispatcherFormMasterData,
  validateDispatcherMasterData,
  suggestDispatcherDepartment,
  nextDispatcherCode,
  type SelectOption,
} from '@/lib/dispatcherFormMasterData'
import { systemSetupService, uploadService, employeesService } from '@/lib/api'
import { Station, Department, EmployeeRole, Region, District } from '@/types'
import {
  DispatcherFormErrors,
  DispatcherFormValues,
  DispatcherFormStep,
  getDispatcherAgeLimits,
  getMinJoinDate,
  formatDateInput,
  validateDispatcherForm,
  validateDispatcherFormStep,
  validateProfilePhotoFile,
  getStepFieldErrors,
  DispatcherFormContext,
  MIN_DISPATCHER_AGE,
  MAX_DISPATCHER_AGE,
} from '@/lib/dispatcherFormValidation'

const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'credentials', label: 'Credentials', icon: Shield },
  { id: 'account', label: 'Account', icon: Lock },
] as const

type StepId = (typeof STEPS)[number]['id']

const STEP_FIELDS = {
  personal: [
    'firstName',
    'middleName',
    'lastName',
    'gender',
    'dateOfBirth',
    'nationalId',
    'phone',
    'alternatePhone',
  ],
  location: [
    'address',
    'regionId',
    'districtId',
    'areaZone',
    'stationId',
    'employeeCode',
    'departmentId',
    'employmentType',
    'joinDate',
    'emergencyContactName',
    'relationship',
    'emergencyPhone',
  ],
  credentials: [
    'licenseNumber',
    'licenseExpiryDate',
    'qualification',
    'yearsOfExperience',
    'certificationUpload',
    'notes',
  ],
  account: ['email', 'username', 'password', 'confirmPassword'],
} as const satisfies Record<StepId, readonly (keyof DispatcherFormErrors)[]>

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function photoUrl(path?: string) {
  if (!path) return ''
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

function mapShiftStatus(value: string): string {
  const known = ['AVAILABLE', 'ON_DUTY', 'OFF_DUTY', 'UNAVAILABLE', 'ON_BREAK']
  if (known.includes(value)) return value
  return 'OFF_DUTY'
}

function PhotoUploadBlock({
  displayName,
  employeeCode,
  profilePhoto,
  uploadingPhoto,
  onUpload,
  compact,
}: {
  displayName: string
  employeeCode: string
  profilePhoto: string
  uploadingPhoto: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  compact?: boolean
}) {
  const inputId = compact ? 'dispatcher-photo-upload-mobile' : 'dispatcher-photo-upload'
  return (
    <div
      className={`flex ${compact ? 'flex-row items-center gap-4' : 'flex-col items-center'} p-5 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50`}
    >
      <label
        htmlFor={inputId}
        className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} rounded-2xl bg-white border-2 border-red-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-500 transition shrink-0`}
      >
        {uploadingPhoto ? (
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
        ) : profilePhoto ? (
          <img src={photoUrl(profilePhoto)} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserPlus className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} text-red-300`} />
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUpload}
        disabled={uploadingPhoto}
      />
      <div className={compact ? 'text-left flex-1 min-w-0' : 'text-center'}>
        <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
        <div className={`${compact ? 'mt-1' : 'mt-2 mb-1'}`}>
          <TacticalBadge label={employeeCode} color="red" />
        </div>
        {!compact && (
          <p className="text-[10px] text-slate-500 mt-2">Tap photo to upload profile image</p>
        )}
      </div>
    </div>
  )
}

export default function AddDispatcherForm() {
  const router = useRouter()
  const [step, setStep] = useState<StepId>('personal')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [createdDispatcher, setCreatedDispatcher] = useState<{
    id: string
    code: string
    name: string
    username: string
  } | null>(null)

  const [regions, setRegions] = useState<Region[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeRoles, setEmployeeRoles] = useState<EmployeeRole[]>([])
  const [dispatcherRoleName, setDispatcherRoleName] = useState('Dispatcher')
  const [genderOptions, setGenderOptions] = useState<SelectOption[]>([])
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState<SelectOption[]>([])
  const [shiftStatusOptions, setShiftStatusOptions] = useState<SelectOption[]>([])
  const [qualificationOptions, setQualificationOptions] = useState<SelectOption[]>([])
  const [dispatcherRoleId, setDispatcherRoleId] = useState('')
  const [dispatcherCode, setDispatcherCode] = useState('DIS-001')
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingStations, setLoadingStations] = useState(false)
  const [masterDataError, setMasterDataError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<DispatcherFormErrors>({})

  const [form, setForm] = useState<DispatcherFormValues>({
    profilePhoto: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    alternatePhone: '',
    nationalId: '',
    address: '',
    regionId: '',
    districtId: '',
    areaZone: '',
    stationId: '',
    emergencyContactName: '',
    emergencyPhone: '',
    relationship: '',
    employeeCode: '',
    departmentId: '',
    employmentType: 'Full-time',
    joinDate: new Date().toISOString().split('T')[0],
    shiftStatus: 'OFF_DUTY',
    licenseNumber: '',
    licenseExpiryDate: '',
    qualification: '',
    yearsOfExperience: '',
    certificationUpload: '',
    dispatchConsoleTrained: false,
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    accountActive: true,
    notes: '',
  })

  const patch = (updates: Partial<DispatcherFormValues>) => {
    setForm((f) => ({ ...f, ...updates }))
    setFieldErrors((errs) => {
      const next = { ...errs }
      for (const key of Object.keys(updates) as (keyof DispatcherFormErrors)[]) {
        delete next[key]
      }
      return next
    })
  }

  const phoneDigits = (value: string) => value.replace(/\D/g, '').replace(/^252/, '').slice(0, 9)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const applyMasterData = useCallback((data: Awaited<ReturnType<typeof fetchDispatcherFormMasterData>>) => {
    setRegions(data.regions)
    setDepartments(data.departments)
    setEmployeeRoles(data.employeeRoles)
    setDispatcherRoleId(data.dispatcherRoleId)
    setDispatcherRoleName(data.dispatcherRoleName)
    setGenderOptions(data.genderOptions)
    setEmploymentTypeOptions(data.employmentTypeOptions)
    setShiftStatusOptions(data.shiftStatusOptions)
    setQualificationOptions(data.qualificationOptions)

    const issues = validateDispatcherMasterData(data)
    if (issues.messages.length) {
      setMasterDataError(issues.messages.join(' '))
    }

    return data
  }, [])

  const loadMasterData = useCallback(async () => {
    setLoading(true)
    setMasterDataError(null)
    try {
      const data = applyMasterData(await fetchDispatcherFormMasterData())
      const code = nextDispatcherCode(data.dispatcherStatsTotal)
      setDispatcherCode(code)
      const opsDept = suggestDispatcherDepartment(data.departments)

      setForm((f) => ({
        ...f,
        employeeCode: code,
        departmentId: f.departmentId || opsDept?.id || '',
        employmentType: f.employmentType || data.employmentTypeOptions[0]?.id || 'Full-time',
        qualification: f.qualification || data.qualificationOptions[0]?.id || '',
      }))
    } catch {
      setMasterDataError('Failed to load form data. Check that the backend is running.')
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }, [applyMasterData])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  const masterDataSummary = useMemo(
    () => [
      { label: 'Regions', count: regions.length },
      { label: 'Departments', count: departments.length },
      { label: 'Roles', count: employeeRoles.length },
    ],
    [regions.length, departments.length, employeeRoles.length],
  )

  const validationContext = useMemo<DispatcherFormContext>(
    () => ({
      departmentIds: departments.map((d) => d.id),
      employmentTypeIds: employmentTypeOptions.map((o) => o.id),
      qualificationIds: qualificationOptions.map((o) => o.id),
    }),
    [departments, employmentTypeOptions, qualificationOptions],
  )

  const selectedRegion = useMemo(() => regions.find((r) => r.id === form.regionId), [regions, form.regionId])
  const selectedDistrict = useMemo(() => districts.find((d) => d.id === form.districtId), [districts, form.districtId])
  const selectedStation = useMemo(() => stations.find((s) => s.id === form.stationId), [stations, form.stationId])
  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === form.departmentId),
    [departments, form.departmentId],
  )

  const ageLimits = useMemo(() => getDispatcherAgeLimits(), [])
  const minJoinDate = useMemo(() => getMinJoinDate(form.dateOfBirth), [form.dateOfBirth])
  const minLicenseExpiry = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDateInput(tomorrow)
  }, [])
  const todayStr = useMemo(() => formatDateInput(new Date()), [])

  const handleRegionChange = async (regionId: string) => {
    patch({ regionId, districtId: '', areaZone: '', stationId: '' })
    setDistricts([])
    setStations([])
    if (!regionId) return

    setLoadingDistricts(true)
    try {
      const d = await systemSetupService.getDistricts(regionId)
      setDistricts(Array.isArray(d) ? d.filter((x: District) => x.isActive !== false) : [])
      if (!Array.isArray(d) || d.length === 0) {
        toast.error('No districts in this region. Add districts in System Setup.')
      }
    } catch {
      toast.error('Failed to load districts')
      setDistricts([])
    } finally {
      setLoadingDistricts(false)
    }
  }

  const handleDistrictChange = async (districtId: string) => {
    patch({ districtId, areaZone: '', stationId: '' })
    setStations([])
    if (!districtId) return

    setLoadingStations(true)
    try {
      const stationList = await systemSetupService.getStations(districtId)
      setStations(Array.isArray(stationList) ? stationList.filter((x: Station) => x.isActive !== false) : [])
      if (!Array.isArray(stationList) || stationList.length === 0) {
        toast.error('No stations in this district. Add a station in System Setup.')
      }
    } catch {
      toast.error('Failed to load stations')
      setStations([])
    } finally {
      setLoadingStations(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const photoError = validateProfilePhotoFile(file)
    if (photoError) {
      toast.error(photoError)
      e.target.value = ''
      return
    }

    try {
      setUploadingPhoto(true)
      const res: { url?: string } = await uploadService.uploadFile(file)
      patch({ profilePhoto: res.url || '' })
      toast.success('Photo uploaded')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const buildPayload = () => {
    const firstName = form.middleName.trim()
      ? `${form.firstName.trim()} ${form.middleName.trim()}`
      : form.firstName.trim()

    const addressBase = form.address.trim()
    const areaZone = form.areaZone.trim()
    const fullAddress =
      addressBase && areaZone && !addressBase.includes(areaZone)
        ? `${addressBase}, ${areaZone}`
        : addressBase || areaZone || undefined

    return {
      role: 'EMPLOYEE' as const,
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      employeeRoleId: dispatcherRoleId,
      departmentId: form.departmentId || undefined,
      stationId: form.stationId || undefined,
      firstName,
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      status: form.accountActive ? 'ACTIVE' : 'INACTIVE',
      employeeCode: form.employeeCode.trim() || dispatcherCode,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      nationalId: form.nationalId.trim() || undefined,
      profilePhoto: form.profilePhoto || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyPhone: form.emergencyPhone.trim() || undefined,
      relationship: form.relationship.trim() || undefined,
      address: fullAddress,
      employmentDate: form.joinDate || undefined,
      defaultShift: form.employmentType,
      shiftStatus: mapShiftStatus(form.shiftStatus),
      licenseNumber: form.licenseNumber.trim() || undefined,
      licenseType: 'DISPATCH',
      licenseExpiryDate: form.licenseExpiryDate || undefined,
      licenseStatus: 'VALID',
      qualification: form.qualification.trim() || undefined,
      yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      certificationUpload: form.certificationUpload || undefined,
      notes: form.notes.trim() || undefined,
    }
  }

  const stepFieldErrors = useMemo(() => getStepFieldErrors(step as DispatcherFormStep, fieldErrors), [step, fieldErrors])
  const stepErrorCount = Object.keys(stepFieldErrors).length

  const validateStep = (s: StepId): boolean => {
    const result = validateDispatcherFormStep(s as DispatcherFormStep, form, validationContext)
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const field of STEP_FIELDS[s]) {
        delete next[field]
      }
      return { ...next, ...result.errors }
    })
    if (!result.valid && result.firstMessage) {
      toast.error(result.firstMessage)
    }
    return result.valid
  }

  const goNext = () => {
    if (!validateStep(step)) return
    const idx = STEPS.findIndex((s) => s.id === step)
    if (idx < STEPS.length - 1) {
      const next = STEPS[idx + 1].id
      if (next === 'account' && !form.username && form.phone) {
        patch({ username: phoneDigits(form.phone) })
      }
      setStep(next)
    }
  }

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.id === step)
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  const handleSubmit = async () => {
    if (!dispatcherRoleId) {
      toast.error('Dispatcher role not found in system setup')
      return
    }

    if (!validateStep('account')) return

    const result = validateDispatcherForm(form, validationContext)
    setFieldErrors(result.errors)
    if (!result.valid) {
      if (result.firstMessage) toast.error(result.firstMessage)
      if (result.firstStep) setStep(result.firstStep)
      return
    }

    setSubmitting(true)
    try {
      const created = await employeesService.create(buildPayload())
      const name = `${created.firstName || form.firstName} ${created.lastName || form.lastName}`.trim()
      setCreatedDispatcher({
        id: created.id,
        code: created.employeeCode || form.employeeCode,
        name,
        username: form.username.trim(),
      })
      toast.success('Dispatcher registered successfully')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed'
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setCreatedDispatcher(null)
    setStep('personal')
    setDistricts([])
    setStations([])
    setFieldErrors({})
    loadMasterData()
    setForm({
      profilePhoto: '',
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      phone: '',
      alternatePhone: '',
      nationalId: '',
      address: '',
      regionId: '',
      districtId: '',
      areaZone: '',
      stationId: '',
      emergencyContactName: '',
      emergencyPhone: '',
      relationship: '',
      employeeCode: dispatcherCode,
      departmentId: form.departmentId,
      employmentType: 'Full-time',
      joinDate: new Date().toISOString().split('T')[0],
      shiftStatus: 'OFF_DUTY',
      licenseNumber: '',
      licenseExpiryDate: '',
      qualification: qualificationOptions[0]?.id || '',
      yearsOfExperience: '',
      certificationUpload: '',
      dispatchConsoleTrained: false,
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      accountActive: true,
      notes: '',
    })
  }

  if (createdDispatcher) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-red-100">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-10 text-center text-white">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Dispatcher Registered</h1>
            <p className="text-red-100 text-sm mt-2">Added to command center staff</p>
          </div>
          <div className="p-8 text-center space-y-4 bg-white">
            <p className="text-lg font-bold text-slate-800">{createdDispatcher.name}</p>
            <TacticalBadge label={createdDispatcher.code} color="red" />
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-left text-sm space-y-2">
              <p className="text-xs font-black uppercase text-red-600 tracking-widest">Portal credentials</p>
              <p className="text-slate-700">
                Sign in at{' '}
                <Link href="/dispatcher/login" className="text-red-700 font-bold underline">
                  /dispatcher/login
                </Link>
              </p>
              <p className="text-slate-600">
                Username: <strong className="text-slate-900">{createdDispatcher.username}</strong>
              </p>
              <p className="text-xs text-slate-500">Share the password you set with the dispatcher securely.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/admin/dispatchers"
                className="flex-1 h-11 flex items-center justify-center rounded-xl bg-red-600 text-white text-sm font-bold uppercase hover:bg-red-700"
              >
                All Dispatchers
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 h-11 flex items-center justify-center rounded-xl border-2 border-red-200 text-red-700 text-sm font-bold uppercase hover:bg-red-50"
              >
                Add Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const displayName = `${form.firstName || 'New'} ${form.lastName || 'Dispatcher'}`.trim()

  return (
    <div className="fixed inset-0 z-[100] bg-[#F5F5F5] flex flex-col overflow-hidden">
      <header className="shrink-0 bg-gradient-to-r from-[#C62828] via-[#D32F2F] to-[#E53935] text-white shadow-lg">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/dispatchers')}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">
                Aamin Ambulance · Dispatch Control
              </p>
              <h1 className="text-xl font-black uppercase tracking-wide">Register New Dispatcher</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold uppercase text-red-100">Dispatcher ID</p>
              <p className="text-lg font-black font-mono">{form.employeeCode || dispatcherCode}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 flex gap-1 max-w-2xl">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = s.id === step
            const done = i < stepIndex
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => i <= stepIndex && setStep(s.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  active
                    ? 'bg-white text-red-700 shadow-md'
                    : done
                      ? 'bg-white/30 text-white'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-red-100 p-6 shrink-0 overflow-y-auto">
          <PhotoUploadBlock
            displayName={displayName}
            employeeCode={form.employeeCode || dispatcherCode}
            profilePhoto={form.profilePhoto}
            uploadingPhoto={uploadingPhoto}
            onUpload={handlePhotoUpload}
          />

          {(selectedDepartment || selectedRegion || selectedDistrict || form.areaZone.trim() || selectedStation) && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-red-100 space-y-2">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Assignment</p>
              {selectedDepartment && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Department:</span> {selectedDepartment.name}
                </p>
              )}
              {selectedRegion && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Region:</span> {selectedRegion.name}
                </p>
              )}
              {selectedDistrict && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">District:</span> {selectedDistrict.name}
                </p>
              )}
              {form.areaZone.trim() && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Area / Zone:</span> {form.areaZone.trim()}
                </p>
              )}
              {selectedStation && (
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Station:</span> {selectedStation.name}
                </p>
              )}
            </div>
          )}

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed mt-6">
            Complete all steps to register a dispatcher with system login for the command center.
          </p>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading…</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {!loading && !masterDataError && (
                <div className="flex flex-wrap gap-2">
                  {masterDataSummary.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-red-100 text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                    >
                      {item.label}
                      <span className="text-red-600">{item.count}</span>
                    </span>
                  ))}
                </div>
              )}
              {masterDataError && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-start gap-3 flex-1">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Setup data issue</p>
                      <p className="text-xs mt-1">{masterDataError}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadMasterData()}
                      className="px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-xs font-bold uppercase"
                    >
                      Retry
                    </button>
                    <Link
                      href="/admin/system-setup"
                      className="px-3 py-2 rounded-lg border border-amber-300 text-xs font-bold uppercase hover:bg-white"
                    >
                      System Setup
                    </Link>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 lg:p-10">
                {stepErrorCount > 0 && (
                  <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">
                        {stepErrorCount} field{stepErrorCount !== 1 ? 's need' : ' needs'} attention on this step
                      </p>
                      <p className="text-xs mt-1 text-red-600">{Object.values(stepFieldErrors)[0]}</p>
                    </div>
                  </div>
                )}

                {step === 'personal' && (
                  <>
                    <div className="lg:hidden mb-6">
                      <PhotoUploadBlock
                        displayName={displayName}
                        employeeCode={form.employeeCode || dispatcherCode}
                        profilePhoto={form.profilePhoto}
                        uploadingPhoto={uploadingPhoto}
                        onUpload={handlePhotoUpload}
                        compact
                      />
                    </div>
                    <SectionHeader icon={User} title="Personal Information" subtitle="Legal identity & contact" />
                    <p className="mb-6 text-xs text-slate-500 font-medium">
                      Dispatchers must be between {MIN_DISPATCHER_AGE} and {MAX_DISPATCHER_AGE} years old. Mobile
                      numbers use Somalia format (+252 6/7XXXXXXXX).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput
                        label="First Name"
                        required
                        icon={User}
                        value={form.firstName}
                        error={fieldErrors.firstName}
                        maxLength={50}
                        placeholder="e.g. Ahmed"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ firstName: e.target.value })}
                      />
                      <FormInput
                        label="Middle Name"
                        icon={User}
                        value={form.middleName}
                        error={fieldErrors.middleName}
                        maxLength={50}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ middleName: e.target.value })}
                      />
                      <FormInput
                        label="Last Name"
                        required
                        icon={User}
                        value={form.lastName}
                        error={fieldErrors.lastName}
                        maxLength={50}
                        placeholder="e.g. Hassan"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ lastName: e.target.value })}
                      />
                      <FormSelect
                        label="Gender"
                        required
                        icon={User}
                        options={genderOptions}
                        value={form.gender}
                        error={fieldErrors.gender}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ gender: e.target.value })}
                      />
                      <FormInput
                        label="Date of Birth"
                        required
                        type="date"
                        value={form.dateOfBirth}
                        error={fieldErrors.dateOfBirth}
                        min={ageLimits.minDob}
                        max={ageLimits.maxDob}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ dateOfBirth: e.target.value })}
                      />
                      <FormInput
                        label="National ID"
                        required
                        value={form.nationalId}
                        error={fieldErrors.nationalId}
                        maxLength={20}
                        placeholder="5–20 characters"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ nationalId: e.target.value })}
                      />
                      <FormInput
                        label="Phone"
                        required
                        prefix="+252"
                        icon={Phone}
                        value={form.phone}
                        error={fieldErrors.phone}
                        inputMode="numeric"
                        maxLength={9}
                        placeholder="61XXXXXXX"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ phone: phoneDigits(e.target.value) })
                        }
                      />
                      <FormInput
                        label="Alternate Phone"
                        prefix="+252"
                        icon={Phone}
                        value={form.alternatePhone}
                        error={fieldErrors.alternatePhone}
                        inputMode="numeric"
                        maxLength={9}
                        placeholder="Optional"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ alternatePhone: phoneDigits(e.target.value) })
                        }
                      />
                    </div>
                  </>
                )}

                {step === 'location' && (
                  <>
                    <SectionHeader
                      icon={MapPin}
                      title="Location & Employment"
                      subtitle="Dispatch station assignment"
                      color="red"
                    />

                    {(selectedRegion || selectedDistrict || form.areaZone.trim() || selectedStation) && (
                      <div className="mb-6 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-slate-700">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{selectedRegion?.name || '—'}</span>
                        <ChevronRight className="w-3 h-3 text-red-300" />
                        <span>{selectedDistrict?.name || 'Select district'}</span>
                        {form.areaZone.trim() && (
                          <>
                            <ChevronRight className="w-3 h-3 text-red-300" />
                            <span>{form.areaZone.trim()}</span>
                          </>
                        )}
                        <ChevronRight className="w-3 h-3 text-red-300" />
                        <span className="text-red-700">{selectedStation?.name || 'Select station'}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <FormInput
                          label="Residential Address"
                          required
                          icon={MapPin}
                          value={form.address}
                          error={fieldErrors.address}
                          maxLength={200}
                          placeholder="Street, neighborhood, city"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ address: e.target.value })}
                        />
                      </div>
                      <FormSelect
                        label="Region"
                        required
                        icon={MapPin}
                        options={regions}
                        value={form.regionId}
                        error={fieldErrors.regionId}
                        emptyHint={regions.length ? 'Select Region' : 'No regions — add in System Setup'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRegionChange(e.target.value)}
                      />
                      <FormSelect
                        label="District"
                        required
                        icon={MapPin}
                        options={districts}
                        value={form.districtId}
                        error={fieldErrors.districtId}
                        disabled={!form.regionId}
                        loading={loadingDistricts}
                        emptyHint={
                          !form.regionId
                            ? 'Select a region first'
                            : districts.length
                              ? 'Select District'
                              : 'No districts in this region'
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDistrictChange(e.target.value)}
                      />
                      <FormInput
                        label="Area / Zone"
                        icon={MapPin}
                        value={form.areaZone}
                        error={fieldErrors.areaZone}
                        maxLength={100}
                        placeholder="e.g. Hodan, Wadajir, Zone 3"
                        disabled={!form.districtId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ areaZone: e.target.value })}
                      />
                      <FormSelect
                        label="Dispatch Station"
                        required
                        icon={Building2}
                        options={stations}
                        value={form.stationId}
                        error={fieldErrors.stationId}
                        disabled={!form.districtId}
                        loading={loadingStations}
                        emptyHint={
                          !form.districtId
                            ? 'Select a district first'
                            : stations.length
                              ? 'Select Station'
                              : 'No stations — add in System Setup'
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ stationId: e.target.value })}
                      />
                      <FormInput
                        label="Employee Code"
                        required
                        value={form.employeeCode}
                        error={fieldErrors.employeeCode}
                        placeholder="DIS-001"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ employeeCode: e.target.value.toUpperCase() })
                        }
                      />
                      <FormSelect
                        label="Department"
                        required
                        icon={Briefcase}
                        options={departments.map((d) => ({ id: d.id, name: d.name, label: d.name }))}
                        value={form.departmentId}
                        error={fieldErrors.departmentId}
                        emptyHint={
                          departments.length ? 'Select Department' : 'No departments — add in System Setup'
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ departmentId: e.target.value })}
                      />
                      <FormSelect
                        label="Employment Type"
                        required
                        options={employmentTypeOptions}
                        value={form.employmentType}
                        error={fieldErrors.employmentType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          patch({ employmentType: e.target.value })
                        }
                      />
                      <FormInput
                        label="Join Date"
                        type="date"
                        required
                        value={form.joinDate}
                        error={fieldErrors.joinDate}
                        min={minJoinDate}
                        max={todayStr}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ joinDate: e.target.value })}
                      />
                      <FormSelect
                        label="Initial Shift Status"
                        options={shiftStatusOptions}
                        value={form.shiftStatus}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ shiftStatus: e.target.value })}
                      />
                    </div>

                    <div className="mt-8 pt-8 border-t border-red-50">
                      <SectionHeader icon={Phone} title="Emergency Contact" subtitle="Next of kin (optional)" color="red" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput
                          label="Contact Name"
                          icon={User}
                          value={form.emergencyContactName}
                          error={fieldErrors.emergencyContactName}
                          maxLength={50}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            patch({ emergencyContactName: e.target.value })
                          }
                        />
                        <FormInput
                          label="Relationship"
                          value={form.relationship}
                          error={fieldErrors.relationship}
                          maxLength={30}
                          placeholder="e.g. Spouse, Parent"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            patch({ relationship: e.target.value })
                          }
                        />
                        <FormInput
                          label="Contact Phone"
                          prefix="+252"
                          icon={Phone}
                          value={form.emergencyPhone}
                          error={fieldErrors.emergencyPhone}
                          inputMode="numeric"
                          maxLength={9}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            patch({ emergencyPhone: phoneDigits(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === 'credentials' && (
                  <>
                    <SectionHeader
                      icon={Shield}
                      title="Dispatch Credentials"
                      subtitle="Certification & training"
                      color="red"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput
                        label="Certification / Training ID"
                        required
                        icon={Shield}
                        value={form.licenseNumber}
                        error={fieldErrors.licenseNumber}
                        maxLength={25}
                        placeholder="e.g. DIS-CERT-2024-001"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ licenseNumber: e.target.value.toUpperCase() })
                        }
                      />
                      <FormInput
                        label="Certificate Expiry"
                        required
                        type="date"
                        value={form.licenseExpiryDate}
                        error={fieldErrors.licenseExpiryDate}
                        min={minLicenseExpiry}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ licenseExpiryDate: e.target.value })
                        }
                      />
                      <FormSelect
                        label="Qualification"
                        required
                        icon={GraduationCap}
                        options={qualificationOptions}
                        value={form.qualification}
                        error={fieldErrors.qualification}
                        emptyHint={
                          qualificationOptions.length
                            ? 'Select qualification'
                            : 'No qualifications configured'
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          patch({ qualification: e.target.value })
                        }
                      />
                      <FormInput
                        label="Years of Experience"
                        type="number"
                        min={0}
                        max={50}
                        value={form.yearsOfExperience}
                        error={fieldErrors.yearsOfExperience}
                        placeholder="Optional"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ yearsOfExperience: e.target.value })
                        }
                      />
                    </div>
                    <div className="mt-6">
                      <FormCheckbox
                        label="Dispatch Console Trained"
                        description="Completed hands-on training on the Aamin dispatch console"
                        checked={form.dispatchConsoleTrained}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ dispatchConsoleTrained: e.target.checked })
                        }
                      />
                    </div>
                    <div className="mt-6">
                      {fieldErrors.certificationUpload && (
                        <p className="text-[9px] font-bold text-red-500 uppercase mb-2">{fieldErrors.certificationUpload}</p>
                      )}
                      <FileUploadCard
                        label="Dispatch Certificate *"
                        icon={Shield}
                        description="Upload dispatch certification or training document (PDF, JPG, PNG)"
                        accept="image/*,application/pdf"
                        value={form.certificationUpload}
                        onChange={(url: string) => patch({ certificationUpload: url })}
                      />
                    </div>
                    <div className="mt-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                      {fieldErrors.notes && (
                        <span className="ml-2 text-[9px] font-bold text-red-500 uppercase">{fieldErrors.notes}</span>
                      )}
                      <textarea
                        className={`mt-2 w-full h-24 p-4 bg-slate-50 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 ${
                          fieldErrors.notes ? 'border-red-300' : 'border-red-100'
                        }`}
                        placeholder="Shift preferences, languages spoken, console experience…"
                        maxLength={500}
                        value={form.notes}
                        onChange={(e) => patch({ notes: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 mt-1 text-right">{form.notes.length}/500</p>
                    </div>
                  </>
                )}

                {step === 'account' && (
                  <>
                    <SectionHeader icon={Lock} title="System Account" subtitle="Dispatcher portal login" color="red" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput
                        label="Email"
                        required
                        type="email"
                        value={form.email}
                        error={fieldErrors.email}
                        placeholder="dispatcher@example.com"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ email: e.target.value.trim() })}
                      />
                      <FormInput
                        label="Username"
                        required
                        value={form.username}
                        error={fieldErrors.username}
                        maxLength={30}
                        placeholder="Letters, numbers, underscore"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ username: e.target.value.replace(/\s/g, '') })
                        }
                      />
                      <FormInput
                        label="Password"
                        required
                        type="password"
                        value={form.password}
                        error={fieldErrors.password}
                        placeholder="Min 8 chars, letters + numbers"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ password: e.target.value })}
                      />
                      <FormInput
                        label="Confirm Password"
                        required
                        type="password"
                        value={form.confirmPassword}
                        error={fieldErrors.confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ confirmPassword: e.target.value })
                        }
                      />
                    </div>
                    <div className="mt-6">
                      <FormCheckbox
                        label="Account Active"
                        description="Dispatcher can log in to the dispatch console immediately"
                        checked={form.accountActive}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ accountActive: e.target.checked })
                        }
                      />
                    </div>
                    <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                      <Radio className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <TacticalBadge label={`Role: ${dispatcherRoleName} (Employee)`} color="red" />
                        <p className="text-xs text-slate-600 mt-3">
                          Employee role loaded from System Setup (<strong>{dispatcherRoleName}</strong>). This creates
                          an <strong>EMPLOYEE</strong> account for emergency dispatch workflows.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {!loading && (
        <footer className="shrink-0 bg-white border-t border-red-100 px-4 sm:px-6 py-4 shadow-[0_-4px_20px_rgba(198,40,40,0.08)]">
          <div className="max-w-3xl mx-auto flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center sm:text-left">
              Step {stepIndex + 1} of {STEPS.length}
            </div>
            <div className="flex gap-3 justify-end">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goBack} className="h-11 font-bold uppercase text-xs">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {step !== 'account' ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="h-11 px-8 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs shadow-lg disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Register Dispatcher
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
