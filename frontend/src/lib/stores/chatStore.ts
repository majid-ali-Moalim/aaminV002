import { create } from 'zustand'

interface ChatState {
  unreadTotal: number
  setUnreadTotal: (n: number) => void
  incrementUnread: (by?: number) => void
}

export const useChatStore = create<ChatState>((set) => ({
  unreadTotal: 0,
  setUnreadTotal: (n) => set({ unreadTotal: Math.max(0, n) }),
  incrementUnread: (by = 1) => set((s) => ({ unreadTotal: Math.max(0, s.unreadTotal + by) })),
}))
