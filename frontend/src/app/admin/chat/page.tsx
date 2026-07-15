import { Suspense } from 'react'
import ChatWorkspace from '@/components/chat/ChatWorkspace'
import { Loader2 } from 'lucide-react'

function ChatLoading() {
  return (
    <div className="h-[calc(100dvh-7.5rem)] min-h-[520px] flex items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  )
}

export default function AdminChatPage() {
  return (
    <div className="h-[calc(100dvh-7.5rem)] min-h-[520px]">
      <Suspense fallback={<ChatLoading />}>
        <ChatWorkspace />
      </Suspense>
    </div>
  )
}
