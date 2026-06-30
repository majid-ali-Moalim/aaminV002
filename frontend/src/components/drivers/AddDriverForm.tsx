'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Shield,
  Lock,
  Truck,
  Save,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SectionHeader,
  TacticalBadge,
  FormInput,
  FormSelect,
  FormCheckbox,
  FileUploadCard,
} from '@/components/drivers/DriverFormSections'
import {
  systemSetupService,
  ambulancesService,
  uploadService,
  employeesService,
  emergencyRequestsService,
} from '@/lib/api'
import { Ambulance, Department, EmployeeRole, Region } from '@/types'
import {
  suggestEmployeeCode,
  departmentsForRole,
  defaultUsernameFromFirstName,
} from '@/lib/staffEmployeeCode'
import { EMERGENCY_CONTACT_RELATIONSHIPS } from '@/lib/staff/emergencyContact'
import {
  DriverFormErrors,
  getDriverAgeLimits,
  getMinJoinDate,
  formatDateInput,
  validateDriverForm,
  validateDriverFormStep,
  validateProfilePhotoFile,
  MIN_DRIVER_AGE,
  MAX_DRIVER_AGE,
} from '@/lib/driverFormValidation'
import {
  ADMIN_STAFF_STATUS_OPTIONS,
  mapStaffShiftStatus,
} from '@/lib/staff/status'
import {
  SOMALIA_DRIVER_LICENSE_CLASSES,
  SOMALIA_LICENSE_NUMBER_HINT,
  SOMALIA_NATIONAL_ID_LICENSE_NOTE,
  SOMALIA_LICENSE_VALIDITY_YEARS,
  computeSomaliaLicenseExpiry,
} from '@/lib/drivers/somaliaDriverLicense'
import SomaliaDriverLicenseInfo from '@/components/drivers/SomaliaDriverLicenseInfo'

const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'professional', label: 'License', icon: Shield },
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
    'employeeCode',
    'departmentId',
    'joinDate',
    'emergencyContactName',
    'relationship',
    'emergencyPhone',
  ],
  professional: ['licenseNumber', 'licenseClass', 'licenseIssueDate', 'licenseExpiryDate', 'yearsOfExperience', 'notes'],
  account: ['email', 'password', 'confirmPassword'],
} as const satisfies Record<StepId, readonly (keyof DriverFormErrors)[]>

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function photoUrl(path?: string) {
  if (!path) return ''
  return path.startsWith('http') ? path : `${API_BASE}${path}`
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
  const inputId = compact ? 'driver-photo-upload-mobile' : 'driver-photo-upload'
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

export default function AddDriverForm({
  listPath = '/admin/drivers',
  systemSetupPath = '/admin/system-setup',
  onSubmitForbidden,
  persistKey,
}: {
  listPath?: string
  systemSetupPath?: string
  onSubmitForbidden?: (message: string) => void | Promise<void>
  /** When set, saves step + form draft to sessionStorage (survives remounts). */
  persistKey?: string
}) {
  const router = useRouter()
  const storageKey = persistKey ? `aamin-form:${persistKey}` : null

  const readPersisted = () => {
    if (!storageKey || typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const persisted = readPersisted()
  const hasPersistedDraft = Boolean(persisted?.step || persisted?.form)
  const persistedDraftRef = useRef(persisted)

  const [step, setStep] = useState<StepId>((persisted?.step as StepId) ?? 'personal')
  const [loading, setLoading] = useState(!hasPersistedDraft)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [createdDriver, setCreatedDriver] = useState<{ id: string; code: string; name: string } | null>(null)

  const [regions, setRegions] = useState<Region[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [driverRoleId, setDriverRoleId] = useState('')
  const [driverCode, setDriverCode] = useState('DR-001')
  const [masterDataError, setMasterDataError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<DriverFormErrors>({})

  const defaultForm = {
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
    emergencyContactName: '',
    emergencyPhone: '',
    relationship: '',
    employeeCode: '',
    departmentId: '',
    employmentType: 'Full-time',
    joinDate: new Date().toISOString().split('T')[0],
    shiftStatus: 'UNAVAILABLE',
    assignedAmbulanceId: '',
    licenseNumber: '',
    licenseClass: 'B',
    licenseIssueDate: '',
    licenseExpiryDate: '',
    yearsOfExperience: '',
    emergencyDrivingTraining: false,
    firstAidCertified: false,
    advancedLifeSupport: false,
    certificationUpload: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    accountActive: true,
    notes: '',
  }

  const [form, setForm] = useState(() => ({
    ...defaultForm,
    ...(persisted?.form ?? {}),
  }))

  const patch = (updates: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...updates }))
    setFieldErrors((errs) => {
      const next = { ...errs }
      for (const key of Object.keys(updates) as (keyof DriverFormErrors)[]) {
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

  useEffect(() => {
    if (!storageKey) return
    sessionStorage.setItem(storageKey, JSON.stringify({ step, form }))
  }, [storageKey, step, form])

  const loadMasterData = useCallback(async () => {
    setLoading(true)
    setMasterDataError(null)
    try {
      const [regs, depts, roles, ambs] = await Promise.all([
        systemSetupService.getRegions(),
        systemSetupService.getDepartments(),
        systemSetupService.getRoles(),
        ambulancesService.getAll().catch(() => emergencyRequestsService.getAvailableAmbulances()),
      ])

      const regionsList = Array.isArray(regs) ? regs : []
      const deptList = Array.isArray(depts) ? depts : []
      const rolesList = Array.isArray(roles) ? roles : []

      if (!regionsList.length) {
        setMasterDataError('No regions found. Add regions in System Setup first.')
      }
      if (!rolesList.length) {
        setMasterDataError('Employee roles not loaded. Check your connection or System Setup.')
      }

      setRegions(regionsList)
      setDepartments(departmentsForRole(deptList, 'driver'))

      const driverRole = rolesList.find((r: EmployeeRole) => r.name === 'Driver')
      if (!driverRole?.id) {
        setMasterDataError('Driver role not found. Add a "Driver" role in System Setup.')
      }
      setDriverRoleId(driverRole?.id || '')

      const roleDepts = departmentsForRole(deptList, 'driver')
      const defaultDept = roleDepts[0]

      const code = await suggestEmployeeCode('DR', driverRole?.id)
      setDriverCode(code)

      setAmbulances(
        (Array.isArray(ambs) ? ambs : []).filter(
          (a: Ambulance) => a.status === 'AVAILABLE' || a.status === 'ON_DUTY'
        )
      )

      const skipFormInit = Boolean(
        storageKey && typeof window !== 'undefined' && sessionStorage.getItem(storageKey),
      )

      if (!skipFormInit) {
        patch({
          employeeCode: code,
          departmentId: defaultDept?.id || '',
        })
      } else {
        try {
          const draft = JSON.parse(sessionStorage.getItem(storageKey!)!)
          if (draft?.form?.employeeCode) setDriverCode(draft.form.employeeCode)
        } catch {
          /* ignore */
        }
      }
    } catch {
      setMasterDataError('Failed to load form data. Check that the backend is running.')
      toast.error('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }, [storageKey])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  const ageLimits = useMemo(() => getDriverAgeLimits(), [])
  const minJoinDate = useMemo(() => getMinJoinDate(form.dateOfBirth), [form.dateOfBirth])
  const minLicenseExpiry = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDateInput(tomorrow)
  }, [])
  const todayStr = useMemo(() => formatDateInput(new Date()), [])

  const handleRegionChange = (regionId: string) => {
    patch({ regionId })
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

  const buildQualification = () => {
    const parts: string[] = []
    if (form.emergencyDrivingTraining) parts.push('Emergency Driving')
    if (form.firstAidCertified) parts.push('First Aid / BLS')
    if (form.advancedLifeSupport) parts.push('ALS Training')
    return parts.join(', ') || undefined
  }

  const buildPayload = () => {
    const firstName = form.middleName.trim()
      ? `${form.firstName.trim()} ${form.middleName.trim()}`
      : form.firstName.trim()

    const username = defaultUsernameFromFirstName(form.firstName, form.phone)

    return {
      role: 'EMPLOYEE' as const,
      username,
      email: form.email.trim(),
      password: form.password,
      employeeRoleId: driverRoleId,
      departmentId: form.departmentId || undefined,
      firstName,
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      status: 'ACTIVE' as const,
      employeeCode: form.employeeCode.trim() || driverCode,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      nationalId: form.nationalId.trim() || undefined,
      profilePhoto: form.profilePhoto || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyPhone: form.emergencyPhone.trim() || undefined,
      relationship: form.relationship.trim() || undefined,
      address: form.address.trim() || undefined,
      licenseNumber: form.licenseNumber.trim() || undefined,
      licenseClass: form.licenseClass || undefined,
      licenseType: `Class ${form.licenseClass}`,
      licenseIssueDate: form.licenseIssueDate || undefined,
      licenseExpiryDate: form.licenseExpiryDate || undefined,
      licenseStatus: 'VALID',
      medicalFitness: 'FIT',
      employmentDate: form.joinDate || undefined,
      defaultShift: form.employmentType,
      assignedAmbulanceId: form.assignedAmbulanceId || undefined,
      shiftStatus: mapStaffShiftStatus(form.shiftStatus),
      yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
      certificationUpload: form.certificationUpload || undefined,
      qualification: buildQualification(),
      specialization: form.notes.trim() || undefined,
    }
  }

  const validateStep = (s: StepId): boolean => {
    const formForStep =
      s === 'account'
        ? { ...form, username: form.username || defaultUsernameFromFirstName(form.firstName, form.phone) }
        : form
    const result = validateDriverFormStep(s, formForStep)
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
      if (next === 'account') {
        patch({ username: defaultUsernameFromFirstName(form.firstName, form.phone) })
      }
      setStep(next)
    }
  }

  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.id === step)
    if (idx > 0) setStep(STEPS[idx - 1].id)
  }

  const handleSubmit = async () => {
    if (!driverRoleId) {
      toast.error('Driver role not found in system setup')
      return
    }

    const accountForm = {
      ...form,
      username: form.username || defaultUsernameFromFirstName(form.firstName, form.phone),
    }

    const result = validateDriverForm(accountForm)
    setFieldErrors(result.errors)
    if (!result.valid) {
      if (result.firstMessage) toast.error(result.firstMessage)
      if (result.firstStep) setStep(result.firstStep)
      return
    }

    setSubmitting(true)
    try {
      const result = await employeesService.create(buildPayload())
      const name = `${result.firstName || form.firstName} ${result.lastName || form.lastName}`.trim()
      setCreatedDriver({
        id: result.id,
        code: result.employeeCode || form.employeeCode,
        name,
      })
      if (storageKey) sessionStorage.removeItem(storageKey)
      toast.success('Driver registered successfully')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed'
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg)
      if (err?.response?.status === 403 && onSubmitForbidden) {
        await onSubmitForbidden(text)
      } else {
        toast.error(text)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (createdDriver) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-red-100">
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-10 text-center text-white">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Driver Registered</h1>
            <p className="text-red-100 text-sm mt-2">Added to Aamin Ambulance fleet</p>
          </div>
          <div className="p-8 text-center space-y-4 bg-white">
            <p className="text-lg font-bold text-slate-800">{createdDriver.name}</p>
            <TacticalBadge label={createdDriver.code} color="red" />
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href={listPath}
                className="flex-1 h-11 flex items-center justify-center rounded-xl bg-red-600 text-white text-sm font-bold uppercase hover:bg-red-700"
              >
                All Drivers
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (storageKey) sessionStorage.removeItem(storageKey)
                  setCreatedDriver(null)
                  setStep('personal')
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
                    emergencyContactName: '',
                    emergencyPhone: '',
                    relationship: '',
                    employeeCode: driverCode,
                    departmentId: form.departmentId,
                    employmentType: 'Full-time',
                    joinDate: new Date().toISOString().split('T')[0],
                    shiftStatus: 'UNAVAILABLE',
                    assignedAmbulanceId: '',
                    licenseNumber: '',
                    licenseClass: 'B',
                    licenseIssueDate: '',
                    licenseExpiryDate: '',
                    yearsOfExperience: '',
                    emergencyDrivingTraining: false,
                    firstAidCertified: false,
                    advancedLifeSupport: false,
                    certificationUpload: '',
                    email: '',
                    username: '',
                    password: '',
                    confirmPassword: '',
                    accountActive: true,
                    notes: '',
                  })
                }}
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
  const displayName = `${form.firstName || 'New'} ${form.lastName || 'Driver'}`.trim()

  return (
    <div className="fixed inset-0 z-[100] bg-[#F5F5F5] flex flex-col overflow-hidden">
      {/* Red & white header */}
      <header className="shrink-0 bg-gradient-to-r from-[#C62828] via-[#D32F2F] to-[#E53935] text-white shadow-lg">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(listPath)}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-100">
                Aamin Ambulance · Driver Management
              </p>
              <h1 className="text-xl font-black uppercase tracking-wide">Register New Driver</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold uppercase text-red-100">Driver ID</p>
              <p className="text-lg font-black font-mono">{form.employeeCode || driverCode}</p>
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
        {/* White sidebar preview */}
        <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-red-100 p-6 shrink-0 overflow-y-auto">
          <PhotoUploadBlock
            displayName={displayName}
            employeeCode={form.employeeCode || driverCode}
            profilePhoto={form.profilePhoto}
            uploadingPhoto={uploadingPhoto}
            onUpload={handlePhotoUpload}
          />

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed mt-6">
            Complete all steps to register a driver with system login and optional ambulance assignment.
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
                      href={systemSetupPath}
                      className="px-3 py-2 rounded-lg border border-amber-300 text-xs font-bold uppercase hover:bg-white"
                    >
                      System Setup
                    </Link>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 lg:p-10">
                {step === 'personal' && (
                  <>
                    <div className="lg:hidden mb-6">
                      <PhotoUploadBlock
                        displayName={displayName}
                        employeeCode={form.employeeCode || driverCode}
                        profilePhoto={form.profilePhoto}
                        uploadingPhoto={uploadingPhoto}
                        onUpload={handlePhotoUpload}
                        compact
                      />
                    </div>
                    <SectionHeader icon={User} title="Personal Information" subtitle="Legal identity & contact" />
                    <p className="mb-6 text-xs text-slate-500 font-medium">
                      Drivers must be between {MIN_DRIVER_AGE} and {MAX_DRIVER_AGE} years old. Mobile numbers use Somalia
                      format (+252 6/7XXXXXXXX).
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
                        options={[
                          { id: 'MALE', label: 'Male' },
                          { id: 'FEMALE', label: 'Female' },
                        ]}
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
                        placeholder="Linked to your driver license"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ nationalId: e.target.value })}
                      />
                      <p className="md:col-span-2 -mt-3 text-[10px] text-slate-500">{SOMALIA_NATIONAL_ID_LICENSE_NOTE}</p>
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ phone: phoneDigits(e.target.value) })}
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
                    <SectionHeader icon={MapPin} title="Location & Employment" subtitle="Region and department" color="red" />

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
                      <FormInput
                        label="Employee Code"
                        required
                        readOnly
                        value={form.employeeCode || driverCode}
                        error={fieldErrors.employeeCode}
                        className="bg-slate-100 cursor-not-allowed font-mono font-bold"
                      />
                      <FormSelect
                        label="Department"
                        required
                        icon={Briefcase}
                        options={departments}
                        value={form.departmentId}
                        error={fieldErrors.departmentId}
                        emptyHint={departments.length ? 'Select Department' : 'No departments loaded'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ departmentId: e.target.value })}
                      />
                      <FormSelect
                        label="Employment Type"
                        options={[
                          { id: 'Full-time', label: 'Full-time' },
                          { id: 'Part-time', label: 'Part-time' },
                          { id: 'Contract', label: 'Contract' },
                        ]}
                        value={form.employmentType}
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
                    </div>

                    <div className="mt-8 pt-8 border-t border-red-50">
                      <SectionHeader icon={Phone} title="Emergency Contact" subtitle="Next of kin" color="red" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput
                          label="Contact Name"
                          required
                          icon={User}
                          value={form.emergencyContactName}
                          error={fieldErrors.emergencyContactName}
                          maxLength={50}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            patch({ emergencyContactName: e.target.value })
                          }
                        />
                        <FormSelect
                          label="Relationship"
                          required
                          options={EMERGENCY_CONTACT_RELATIONSHIPS.map((r) => ({ id: r.id, label: r.label }))}
                          value={form.relationship}
                          error={fieldErrors.relationship}
                          emptyHint="Select relationship"
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            patch({ relationship: e.target.value })
                          }
                        />
                        <FormInput
                          label="Contact Phone"
                          required
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

                    <div className="mt-8 pt-8 border-t border-red-50">
                      <SectionHeader icon={Truck} title="Operational" subtitle="Shift & ambulance" color="red" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormSelect
                          label="Initial Shift Status"
                          options={ADMIN_STAFF_STATUS_OPTIONS}
                          value={form.shiftStatus}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            patch({ shiftStatus: e.target.value })
                          }
                        />
                        <FormSelect
                          label="Assigned Ambulance"
                          icon={Truck}
                          options={ambulances}
                          value={form.assignedAmbulanceId}
                          emptyHint={
                            ambulances.length
                              ? 'Optional — select ambulance'
                              : 'No ambulances available'
                          }
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            patch({ assignedAmbulanceId: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === 'professional' && (
                  <>
                    <SectionHeader icon={Shield} title="License & Skills" subtitle="Somalia MoTCA credentials & training" color="red" />
                    <SomaliaDriverLicenseInfo />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <FormInput
                        label="License Number"
                        required
                        value={form.licenseNumber}
                        error={fieldErrors.licenseNumber}
                        maxLength={25}
                        placeholder="As printed on license card"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ licenseNumber: e.target.value.toUpperCase() })
                        }
                      />
                      <p className="md:col-span-2 -mt-4 text-[10px] text-slate-500">{SOMALIA_LICENSE_NUMBER_HINT}</p>
                      <FormSelect
                        label="License Class"
                        required
                        options={SOMALIA_DRIVER_LICENSE_CLASSES.map((cls) => ({
                          id: cls.id,
                          label: `${cls.label} — ${cls.description}`,
                        }))}
                        value={form.licenseClass}
                        error={fieldErrors.licenseClass}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          patch({ licenseClass: e.target.value })
                        }
                      />
                      <FormInput
                        label="License Issue Date"
                        type="date"
                        value={form.licenseIssueDate}
                        error={fieldErrors.licenseIssueDate}
                        max={todayStr}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const issueDate = e.target.value
                          patch({
                            licenseIssueDate: issueDate,
                            licenseExpiryDate: issueDate
                              ? computeSomaliaLicenseExpiry(issueDate)
                              : form.licenseExpiryDate,
                          })
                        }}
                      />
                      <FormInput
                        label="License Expiry"
                        required
                        type="date"
                        value={form.licenseExpiryDate}
                        error={fieldErrors.licenseExpiryDate}
                        min={minLicenseExpiry}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ licenseExpiryDate: e.target.value })
                        }
                      />
                      <p className="md:col-span-2 text-[10px] text-slate-500">
                        Standard Somali driver licenses are valid for {SOMALIA_LICENSE_VALIDITY_YEARS} years. Expiry
                        auto-fills when you enter an issue date.
                      </p>
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
                    <div className="mt-6 space-y-3">
                      <FormCheckbox
                        label="Emergency Driving Training"
                        checked={form.emergencyDrivingTraining}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ emergencyDrivingTraining: e.target.checked })
                        }
                      />
                      <FormCheckbox
                        label="First Aid Certified"
                        checked={form.firstAidCertified}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ firstAidCertified: e.target.checked })
                        }
                      />
                      <FormCheckbox
                        label="Advanced Life Support"
                        checked={form.advancedLifeSupport}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          patch({ advancedLifeSupport: e.target.checked })
                        }
                      />
                    </div>
                    <div className="mt-6">
                      <FileUploadCard
                        label="License / Certificate"
                        icon={Shield}
                        description="Upload license scan (PDF, JPG, PNG)"
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
                        placeholder="Additional remarks…"
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
                    <SectionHeader icon={Lock} title="System Account" subtitle="Driver portal login" color="red" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormInput
                        label="Email"
                        required
                        type="email"
                        value={form.email}
                        error={fieldErrors.email}
                        placeholder="driver@example.com"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ email: e.target.value.trim() })}
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
                    <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100">
                      <TacticalBadge label="Role: Driver (Employee)" color="red" />
                      <p className="text-xs text-slate-600 mt-3">
                        This creates an <strong>EMPLOYEE</strong> account linked to the Driver role. The driver can
                        sign in at <code className="text-red-700">/driver/login</code> to receive missions.
                      </p>
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
                      <Save className="w-4 h-4 mr-2" /> Register Driver
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
