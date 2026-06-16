import Link from 'next/link'

export default function HospitalForgotPasswordPage() {
  return (
    <div className="hosp-login-page">
      <div className="hosp-login-card">
        <h1 className="text-xl font-black mb-2">Reset Password</h1>
        <p className="text-sm text-slate-500 mb-6">Contact your system administrator or use the central password reset flow.</p>
        <Link href="/forgot-password" className="hosp-btn primary inline-flex">Go to Password Reset</Link>
        <Link href="/hospital/login" className="block text-center mt-4 text-sm text-teal-700">Back to hospital login</Link>
      </div>
    </div>
  )
}
