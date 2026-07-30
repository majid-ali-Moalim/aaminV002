'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  Send,
  Loader2,
  Check,
  CheckCheck,
  MessageSquare,
  Paperclip,
  X,
  FileText,
  Download,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  Star,
  Radio,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { chatService, type ChatContact, type ChatMessage } from '@/lib/api'
import { useChatSocket } from '@/lib/useChatSocket'
import { useChatStore } from '@/lib/stores/chatStore'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import {
  ensureCasePrefix,
  formatCaseMessagePreview,
  parseDispatchCaseFromSearchParams,
  chatBasePathFromPathname,
  type DispatchCaseMessageContext,
} from '@/lib/dispatchCaseMessage'
import {
  contactRowHighlightClass,
  relationshipLabel,
  roleBadgeLabel,
  roleRingClass,
  sortChatContacts,
  splitCaseTeamContacts,
} from '@/lib/chat/contactPresentation'
import CaseLinkedMessageText from '@/components/chat/CaseLinkedMessageText'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${a}${b}`.toUpperCase() || '?'
}

function fmtTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtListTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return fmtTime(value)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fmtSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Avatar({
  name,
  avatar,
  size = 48,
  roleCategory,
  isPrimary,
}: {
  name: string
  avatar: string | null
  size?: number
  roleCategory?: string
  isPrimary?: boolean
}) {
  const src = profilePhotoUrl(avatar)
  const [broken, setBroken] = useState(false)
  const ring = roleRingClass(roleCategory, isPrimary)
  const inner = src && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className={`rounded-full object-cover shrink-0 ${ring}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </div>
  )

  return (
    <div className="relative shrink-0">
      {inner}
      {isPrimary && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center border-2 border-white shadow-sm"
          title="Primary case contact"
        >
          <Star className="w-2.5 h-2.5 fill-current" />
        </span>
      )}
    </div>
  )
}

function ContactRow({
  contact: c,
  active,
  onSelect,
}: {
  contact: ChatContact
  active: boolean
  onSelect: (c: ChatContact) => void
}) {
  const relLabel = relationshipLabel(c)
  const roleLabel = roleBadgeLabel(c)

  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors ${contactRowHighlightClass(c, active)}`}
    >
      <div className="relative">
        <Avatar
          name={c.name}
          avatar={c.avatar}
          roleCategory={c.roleCategory}
          isPrimary={c.isPrimaryContact}
        />
        {c.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-900 truncate">{c.name}</span>
            {c.isPrimaryContact && (
              <Radio className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden />
            )}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">{fmtListTime(c.lastMessageAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {relLabel ? (
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                c.isPrimaryContact
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {relLabel}
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {roleLabel}
            </span>
          )}
          {c.caseTrackingCode && c.relationship && (
            <span className="text-[10px] text-slate-400 truncate">{c.caseTrackingCode}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-slate-500 truncate">
            {c.lastMessage ? (
              <>
                {c.lastMessageFromMe && <span className="text-slate-400">You: </span>}
                {c.lastMessage}
              </>
            ) : (
              <span className="text-emerald-600 font-medium">{c.role}</span>
            )}
          </span>
          {c.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function AttachmentView({ msg }: { msg: ChatMessage }) {
  if (!msg.attachmentUrl) return null
  const url = profilePhotoUrl(msg.attachmentUrl)
  const isImage = (msg.attachmentType || '').startsWith('image/')

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={msg.attachmentName || 'image'}
          className="rounded-lg max-w-full max-h-64 object-cover"
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={msg.attachmentName || undefined}
      className="flex items-center gap-2 mb-1 px-2.5 py-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate">{msg.attachmentName || 'File'}</p>
        <p className="text-[10px] text-slate-500">{fmtSize(msg.attachmentSize)}</p>
      </div>
      <Download className="w-4 h-4 text-slate-500 shrink-0" />
    </a>
  )
}

export default function ChatWorkspace({ focusChatOnSelect = false }: { focusChatOnSelect?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const myId = user?.id ?? ''
  const setUnreadTotal = useChatStore((s) => s.setUnreadTotal)

  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [search, setSearch] = useState('')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [caseContext, setCaseContext] = useState<DispatchCaseMessageContext | null>(null)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dispatchCaseHandledRef = useRef(false)

  const loadContacts = useCallback(async () => {
    try {
      const data = await chatService.getContacts()
      setContacts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load chat contacts', err)
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
    const interval = setInterval(loadContacts, 20000)
    return () => clearInterval(interval)
  }, [loadContacts])

  // Keep the global unread badge authoritative while the workspace is open
  useEffect(() => {
    const total = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
    setUnreadTotal(total)
  }, [contacts, setUnreadTotal])

  const openConversation = useCallback(async (contact: ChatContact) => {
    setActiveId(contact.userId)
    setActiveContact(contact)
    setLoadingMessages(true)
    setEditingId(null)
    setContacts((prev) => prev.map((c) => (c.userId === contact.userId ? { ...c, unreadCount: 0 } : c)))
    try {
      const data = await chatService.getMessages(contact.userId)
      setMessages(data.messages)
      setActiveContact({ ...contact, ...data.contact })
    } catch (err) {
      console.error('Failed to load conversation', err)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (dispatchCaseHandledRef.current || loadingContacts) return
    const parsed = parseDispatchCaseFromSearchParams(searchParams)
    if (!parsed) return

    dispatchCaseHandledRef.current = true
    setCaseContext(parsed)

    if (parsed.dispatcherUserId) {
      const contact = contacts.find((c) => c.userId === parsed.dispatcherUserId)
      if (contact) {
        openConversation(contact)
      } else {
        setSearch('dispatcher')
      }
    } else {
      setSearch('dispatcher')
    }

    router.replace(chatBasePathFromPathname(pathname), { scroll: false })
  }, [contacts, loadingContacts, openConversation, pathname, router, searchParams])

  const isForActive = useCallback(
    (senderId: string, recipientId: string) => {
      const other = activeIdRef.current
      if (!other) return false
      return (
        (senderId === other && recipientId === myId) || (senderId === myId && recipientId === other)
      )
    },
    [myId],
  )

  const bumpContactPreview = useCallback(
    (msg: ChatMessage) => {
      const otherId = msg.senderId === myId ? msg.recipientId : msg.senderId
      const preview = msg.content?.trim()
        ? formatCaseMessagePreview(msg.content)
        : msg.attachmentUrl
          ? `📎 ${msg.attachmentName || 'Attachment'}`
          : ''
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.userId === otherId)
        if (idx === -1) {
          loadContacts()
          return prev
        }
        const updated = { ...prev[idx] }
        updated.lastMessage = preview
        updated.lastMessageAt = msg.createdAt
        updated.lastMessageFromMe = msg.senderId === myId
        const isActive = activeIdRef.current === otherId
        if (msg.senderId !== myId && !isActive) {
          updated.unreadCount = (updated.unreadCount ?? 0) + 1
        }
        const next = [...prev]
        next.splice(idx, 1)
        next.push(updated)
        return sortChatContacts(next)
      })
    },
    [myId, loadContacts],
  )

  useChatSocket({
    onMessage: (msg) => {
      if (isForActive(msg.senderId, msg.recipientId)) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        if (msg.senderId !== myId) chatService.markRead(msg.senderId).catch(() => {})
      }
      bumpContactPreview(msg)
    },
    onUpdated: (msg) => {
      if (isForActive(msg.senderId, msg.recipientId)) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)))
      }
    },
    onDeleted: ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    },
    onRead: (payload) => {
      if (payload.by === activeIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === myId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)),
        )
      }
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPendingPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    e.target.value = ''
  }

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
  }

  const handleSend = async () => {
    const rawText = input.trim()
    if ((!rawText && !pendingFile) || !activeId || sending) return
    const text = caseContext
      ? ensureCasePrefix(rawText, caseContext.trackingCode, caseContext.caseId)
      : rawText
    if (!text && !pendingFile) return
    setSending(true)
    try {
      let attachment = null
      if (pendingFile) {
        attachment = await chatService.uploadAttachment(pendingFile)
      }
      const msg = await chatService.sendMessage(activeId, text, attachment)
      setInput('')
      clearPending()
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      bumpContactPreview(msg)
    } catch (err) {
      console.error('Failed to send message', err)
    } finally {
      setSending(false)
    }
  }

  const startEdit = (msg: ChatMessage) => {
    setMenuOpenId(null)
    setEditingId(msg.id)
    setEditingText(msg.content)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const text = editingText.trim()
    if (!text) return
    try {
      const updated = await chatService.editMessage(editingId, text)
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
    } catch (err) {
      console.error('Failed to edit message', err)
    } finally {
      setEditingId(null)
      setEditingText('')
    }
  }

  const deleteMsg = async (id: string) => {
    setMenuOpenId(null)
    if (!window.confirm('Delete this message?')) return
    try {
      await chatService.deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Failed to delete message', err)
    }
  }

  const { caseTeam, others } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? contacts.filter((c) => `${c.name} ${c.role} ${c.caseTrackingCode ?? ''}`.toLowerCase().includes(q))
      : contacts
    return splitCaseTeamContacts(base)
  }, [contacts, search])

  const renderContactList = () => {
    if (loadingContacts) {
      return (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )
    }
    if (caseTeam.length === 0 && others.length === 0) {
      return <p className="text-center text-sm text-slate-400 py-10">No contacts found</p>
    }
    return (
      <>
        {caseTeam.length > 0 && (
          <>
            <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                Your case team
              </span>
            </div>
            {caseTeam.map((c) => (
              <ContactRow
                key={c.userId}
                contact={c}
                active={activeId === c.userId}
                onSelect={openConversation}
              />
            ))}
          </>
        )}
        {others.length > 0 && (
          <>
            {caseTeam.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  All staff
                </span>
              </div>
            )}
            {others.map((c) => (
              <ContactRow
                key={c.userId}
                contact={c}
                active={activeId === c.userId}
                onSelect={openConversation}
              />
            ))}
          </>
        )}
      </>
    )
  }

  return (
    <div className="flex h-full min-h-0 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      {/* Contacts panel */}
      <aside
        className={`w-full md:w-[340px] shrink-0 flex flex-col border-r border-slate-200 bg-white ${
          activeId ? (focusChatOnSelect ? 'hidden' : 'hidden md:flex') : 'flex'
        }`}
      >
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-600"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 flex-1">Communication</h2>
        </div>

        {caseContext && (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Live dispatch case {caseContext.trackingCode}</p>
              <p className="text-amber-800/90 mt-0.5">
                Type your message — the case number is attached automatically before you send.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCaseContext(null)}
              className="p-1 rounded-md hover:bg-amber-100 text-amber-700"
              aria-label="Dismiss case reminder"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or role…"
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-100 border border-transparent focus:border-emerald-300 focus:bg-white text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{renderContactList()}</div>
      </aside>

      {/* Conversation panel */}
      <section
        className={`flex-1 flex-col bg-[#efeae2] ${
          activeId ? 'flex w-full' : focusChatOnSelect ? 'hidden' : 'hidden md:flex'
        }`}
      >
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-emerald-500" />
            </div>
            {caseContext ? (
              <>
                <p className="text-sm font-medium text-slate-600">Select a dispatcher for case {caseContext.trackingCode}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Type your message — Case {caseContext.trackingCode} is added automatically when you send.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium">Select a conversation to start chatting</p>
            )}
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveId(null)
                  setActiveContact(null)
                }}
                className={`${focusChatOnSelect ? 'flex' : 'md:hidden'} p-2 rounded-full hover:bg-slate-200 text-slate-600`}
                aria-label="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar
                name={activeContact.name}
                avatar={activeContact.avatar}
                size={42}
                roleCategory={activeContact.roleCategory}
                isPrimary={activeContact.isPrimaryContact}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-slate-900 truncate">{activeContact.name}</p>
                  {activeContact.isPrimaryContact && (
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {activeContact.online ? (
                    <span className="text-emerald-600">online</span>
                  ) : relationshipLabel(activeContact) ? (
                    <span className="text-amber-700 font-medium">{relationshipLabel(activeContact)}</span>
                  ) : (
                    activeContact.role
                  )}
                  {activeContact.caseTrackingCode && activeContact.relationship && (
                    <span className="text-slate-400"> · {activeContact.caseTrackingCode}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 md:px-10 py-4 space-y-1.5"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
              onClick={() => setMenuOpenId(null)}
            >
              {loadingMessages ? (
                <div className="flex justify-center py-10 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center py-10">
                  <span className="text-xs text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg">
                    No messages yet. Say hello 👋
                  </span>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === myId
                  const editing = editingId === m.id
                  return (
                    <div key={m.id} className={`group flex items-end gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {mine && !editing && (
                        <div className="relative self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(menuOpenId === m.id ? null : m.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/10 text-slate-500 transition-opacity"
                            aria-label="Message options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === m.id && (
                            <div
                              className="absolute right-0 bottom-8 z-10 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => startEdit(m)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteMsg(m.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm text-sm ${
                          mine ? 'bg-[#d9fdd3] text-slate-800 rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm'
                        }`}
                      >
                        <AttachmentView msg={m} />
                        {editing ? (
                          <div className="w-56">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={2}
                              className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-400 bg-white"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null)
                                  setEditingText('')
                                }}
                                className="text-xs px-2 py-1 rounded text-slate-500 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="text-xs px-2 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          m.content && (
                            <CaseLinkedMessageText
                              content={m.content}
                              className="whitespace-pre-wrap break-words"
                            />
                          )
                        )}
                        {!editing && (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {m.editedAt && <span className="text-[10px] text-slate-400 italic">edited</span>}
                            <span className="text-[10px] text-slate-400">{fmtTime(m.createdAt)}</span>
                            {mine &&
                              (m.readAt ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-400" />
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Pending attachment preview */}
            {pendingFile && (
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-3">
                {pendingPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingPreview} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{pendingFile.name}</p>
                  <p className="text-[10px] text-slate-500">{fmtSize(pendingFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={clearPending}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
                  aria-label="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Composer */}
            <div className="px-3 md:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onPickFile}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                placeholder={
                  caseContext
                    ? `Type your message (Case ${caseContext.trackingCode} will be added when you send)…`
                    : 'Type a message…'
                }
                className="flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-emerald-300 focus:outline-none text-sm bg-white"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={(!input.trim() && !pendingFile) || sending}
                className="w-11 h-11 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                aria-label="Send"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
