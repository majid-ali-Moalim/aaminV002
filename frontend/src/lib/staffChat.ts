/** Build admin chat URL to message a driver or nurse (optionally about a case). */
export function buildStaffChatUrl(params: {
  userId: string
  caseId?: string
  trackingCode?: string
}): string {
  const search = new URLSearchParams()
  search.set('userId', params.userId)
  if (params.caseId) search.set('caseId', params.caseId)
  if (params.trackingCode) search.set('trackingCode', params.trackingCode)
  return `/admin/chat?${search.toString()}`
}
