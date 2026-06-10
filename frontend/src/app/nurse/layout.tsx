'use client'

import { ReactNode } from 'react'
import { NurseGuard } from '@/components/guards'
import { NurseSidebar } from '@/components/nurse/NurseSidebar'
import { NurseNotificationProvider } from '@/components/nurse/NurseNotificationProvider'
import './nurse.css'

export default function NurseLayout({ children }: { children: ReactNode }) {
  return (
    <NurseGuard>
      <NurseNotificationProvider>
        <div className="nurse-shell">
          <NurseSidebar />
          <div className="nurse-viewport">{children}</div>
        </div>
      </NurseNotificationProvider>
    </NurseGuard>
  )
}
