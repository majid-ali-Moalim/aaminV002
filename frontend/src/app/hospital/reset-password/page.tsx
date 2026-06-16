import Link from 'next/link'

export default function HospitalResetPasswordPage() {
  return (
    <div className="hosp-login-page">
      <div className="hosp-login-card">
        <h1 className="text-xl font-black mb-2">Set New Password</h1>
        <p className="text-sm text-slate-500 mb-6">Use the reset link from your email or contact admin for a temporary password.</p>
        <Link href="/reset-password" className="hosp-btn primary inline-flex">Open Reset Form</Link>
        <Link href="/hospital/login" className="block text-center mt-4 text-sm text-teal-700">Hospital login</Link>
      </div>
    </div>
  )
}
