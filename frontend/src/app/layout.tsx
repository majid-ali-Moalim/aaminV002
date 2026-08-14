import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import { PublicThemeProvider } from '@/components/public/PublicThemeProvider'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'Aamin Ambulance — Free 24-Hour Emergency Medical Service in Mogadishu',
  description:
    'Aamin Ambulance provides free 24-hour ambulance and pre-hospital emergency medical services in Mogadishu, Somalia. Request an ambulance or call 999 in an emergency.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
        <AuthProvider>
          <PublicThemeProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
              <Navbar />
              <main>{children}</main>
            </div>
            <Toaster position="top-right" />
          </PublicThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
