'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useChatSocket } from '@/lib/useChatSocket'
import { chatService } from '@/lib/api'
import { useChatStore } from '@/lib/stores/chatStore'
import { profilePhotoUrl } from '@/lib/profilePhoto'

function playChatSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.value = 0.06
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    /* audio is best-effort */
  }
}

function chatHrefFor(pathname: string | null): string {
  if (pathname?.startsWith('/driver')) return '/driver/chat'
  if (pathname?.startsWith('/nurse')) return '/nurse/chat'
  if (pathname?.startsWith('/dispatcher')) return '/dispatcher/chat'
  return '/admin/chat'
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${a}${b}`.toUpperCase() || '?'
}

/**
 * Global listener that alerts the receiver of a new chat message anywhere in
 * the app (toast + sound). Skipped when the user is already on a chat page,
 * where the conversation UI handles the message live.
 */
export default function ChatAlerts() {
  const { user } = useAuth()
  const myId = user?.id
  const pathname = usePathname()
  const router = useRouter()
  const setUnreadTotal = useChatStore((s) => s.setUnreadTotal)
  const incrementUnread = useChatStore((s) => s.incrementUnread)

  useEffect(() => {
    if (!myId) return
    chatService
      .getUnreadCount()
      .then((r) => setUnreadTotal(r.total))
      .catch(() => {})
  }, [myId, setUnreadTotal])

  useChatSocket({
    onMessage: (msg) => {
      if (!myId || msg.recipientId !== myId || msg.senderId === myId) return
      // On a chat page the workspace owns the unread count + live UI; skip here
      if (pathname?.endsWith('/chat')) return
      incrementUnread(1)

      const name = msg.senderName || 'New message'
      const role = msg.senderRole || 'Team member'
      const avatar = profilePhotoUrl(msg.senderAvatar ?? null)
      const href = chatHrefFor(pathname)

      playChatSound()
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id)
              router.push(href)
            }}
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } cursor-pointer max-w-sm w-full bg-white shadow-lg rounded-2xl border border-slate-200 p-3 flex items-start gap-3 hover:shadow-xl transition-shadow`}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
                {initialsOf(name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 truncate">{name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">
                  {role}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">{msg.content}</p>
            </div>
          </div>
        ),
        { duration: 6000 },
      )
    },
  })

  return null
}
