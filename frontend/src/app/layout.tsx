import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import { PublicThemeProvider } from '@/components/public/PublicThemeProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Aamin Ambulance - Emergency Dispatch System',
  description: 'Professional ambulance services and emergency medical response',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100`}>
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
