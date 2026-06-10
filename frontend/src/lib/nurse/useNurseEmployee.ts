'use client'

import { useAuth } from '@/context/AuthContext'

/** Logged-in nurse employee id and display info from auth context. */
export function useNurseEmployee() {
  const { user, loading } = useAuth()
  const employee = user?.employee

  return {
    loading,
    nurseId: employee?.id as string | undefined,
    employeeCode: employee?.employeeCode,
    firstName: employee?.firstName ?? user?.firstName,
    lastName: employee?.lastName ?? user?.lastName,
    fullName: [employee?.firstName ?? user?.firstName, employee?.lastName ?? user?.lastName]
      .filter(Boolean)
      .join(' '),
    email: user?.email,
    username: user?.username,
    profilePhoto: employee?.profilePhoto,
    shiftStatus: employee?.shiftStatus,
  }
}
