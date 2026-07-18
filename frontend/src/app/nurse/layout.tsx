'use client'

import { ReactNode } from 'react'
import { NurseGuard } from '@/components/guards'
import { NurseSidebar } from '@/components/nurse/NurseSidebar'
import { NurseNotificationProvider } from '@/components/nurse/NurseNotificationProvider'
import ChatAlerts from '@/components/chat/ChatAlerts'
import { useNurseStore } from '@/lib/stores/nurseStore'
import '@/components/shared/field-case-detail.css'
import './nurse.css'

export default function NurseLayout({ children }: { children: ReactNode }) {
  const theme = useNurseStore((s) => s.theme)
  const shellClass = theme === 'light' ? 'nurse-shell nurse-shell--light' : 'nurse-shell'

  return (
    <NurseGuard>
      <NurseNotificationProvider>
        <ChatAlerts />
        <div className={shellClass}>
          <NurseSidebar />
          <div className="nurse-viewport">{children}</div>
        </div>
      </NurseNotificationProvider>
    </NurseGuard>
  )
}
