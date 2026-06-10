'use client'

import { AlertTriangle, Clock, Infinity as InfinityIcon, Loader2, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import { format } from 'date-fns'

type GrantAccessConfirmModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
  userName: string
  userEmail: string
  permissionKeys: string[]
  sensitiveCount: number
  accessMode: 'unlimited' | 'limited'
  expiresAt: Date | null
}

const PREVIEW_LIMIT = 5

export default function GrantAccessConfirmModal({
  open,
  onClose,
  onConfirm,
  confirming,
  userName,
  userEmail,
  permissionKeys,
  sensitiveCount,
  accessMode,
  expiresAt,
}: GrantAccessConfirmModalProps) {
  if (!open) return null

  const count = permissionKeys.length
  const preview = permissionKeys.slice(0, PREVIEW_LIMIT)
  const remainder = count - preview.length

  const permissionPhrase =
    count === 0
      ? 'no permissions'
      : count === 1
        ? `"${getPermissionLabel(permissionKeys[0])}"`
        : `${count} permissions`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-access-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        <div className="shrink-0 bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/15">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 id="grant-access-title" className="text-lg font-black">
                  Confirm access grant
                </h2>
                <p className="text-sm text-red-100 mt-0.5">Review before applying</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-bold">
                Are you sure you want to grant {permissionPhrase} to{' '}
                <span className="text-red-700">{userName}</span>?
              </p>
              <p className="text-amber-800/80 mt-1 text-xs">{userEmail}</p>
            </div>
          </div>

          {count > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {count === 1 ? 'Permission' : `Permissions (${count})`}
              </p>
              <ul className="space-y-1.5">
                {preview.map((key) => (
                  <li key={key} className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {getPermissionLabel(key)}
                  </li>
                ))}
                {remainder > 0 && (
                  <li className="text-sm font-bold text-slate-500 pl-3.5">
                    + {remainder} more permission{remainder !== 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
            {accessMode === 'unlimited' ? (
              <>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <InfinityIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Unlimited duration</p>
                  <p className="text-xs text-slate-500">Access remains until manually revoked</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Time-limited access</p>
                  <p className="text-xs text-slate-500">
                    Expires {expiresAt ? format(expiresAt, 'MMM dd, yyyy · HH:mm') : '—'}
                  </p>
                </div>
              </>
            )}
          </div>

          {sensitiveCount > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-800">
              <strong>{sensitiveCount} sensitive</strong> permission{sensitiveCount !== 1 ? 's' : ''} included.
              These allow destructive or high-risk actions.
            </div>
          )}

          <p className="text-xs text-slate-500 text-center">
            The user must sign in again after you confirm for changes to take effect.
          </p>
        </div>

        <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-red-600 hover:bg-red-700 min-w-[140px]"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Granting…
              </>
            ) : (
              'Yes, grant access'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
