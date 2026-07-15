'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ChatMessage } from '@/lib/api'

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

let chatSocket: Socket | null = null

interface ChatSocketHandlers {
  onMessage?: (msg: ChatMessage) => void
  onUpdated?: (msg: ChatMessage) => void
  onDeleted?: (payload: { id: string; senderId: string; recipientId: string }) => void
  onRead?: (payload: { by: string }) => void
  onConnectedChange?: (connected: boolean) => void
}

export function useChatSocket(handlers: ChatSocketHandlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    if (!chatSocket) {
      chatSocket = io(`${SOCKET_URL}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      })
    }

    const onConnect = () => ref.current.onConnectedChange?.(true)
    const onDisconnect = () => ref.current.onConnectedChange?.(false)
    const onMessage = (msg: ChatMessage) => ref.current.onMessage?.(msg)
    const onUpdated = (msg: ChatMessage) => ref.current.onUpdated?.(msg)
    const onDeleted = (payload: { id: string; senderId: string; recipientId: string }) =>
      ref.current.onDeleted?.(payload)
    const onRead = (payload: { by: string }) => ref.current.onRead?.(payload)

    chatSocket.on('connect', onConnect)
    chatSocket.on('disconnect', onDisconnect)
    chatSocket.on('chat:message', onMessage)
    chatSocket.on('chat:updated', onUpdated)
    chatSocket.on('chat:deleted', onDeleted)
    chatSocket.on('chat:read', onRead)

    if (chatSocket.connected) ref.current.onConnectedChange?.(true)

    return () => {
      chatSocket?.off('connect', onConnect)
      chatSocket?.off('disconnect', onDisconnect)
      chatSocket?.off('chat:message', onMessage)
      chatSocket?.off('chat:updated', onUpdated)
      chatSocket?.off('chat:deleted', onDeleted)
      chatSocket?.off('chat:read', onRead)
    }
  }, [])
}
