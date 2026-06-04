'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { driverMissionsApi } from '@/lib/driverApi'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { Send, Phone, AlertCircle, ShieldAlert, Radio, FileText, Download, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Message {
  id: string
  sender: 'driver' | 'dispatcher' | 'system'
  text: string
  timestamp: string
  fileUrl?: string
  fileName?: string
}

export default function DriverCommunicationPage() {
  const router = useRouter()
  const { isAuthenticated, activeMission } = useDriverStore()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'direct' | 'mission' | 'broadcast'>('direct')
  const [inputText, setInputText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Mock message data for high fidelity
  const [directMessages, setDirectMessages] = useState<Message[]>([
    { id: '1', sender: 'dispatcher', text: 'Driver 104, please confirm your current fuel level.', timestamp: '17:15' },
    { id: '2', sender: 'driver', text: 'Fuel level is at 85%. Ready for dispatch.', timestamp: '17:16' },
    { id: '3', sender: 'dispatcher', text: 'Acknowledged. Standby for critical mission assignment.', timestamp: '17:18' },
  ])

  const [missionMessages, setMissionMessages] = useState<Message[]>([
    { id: 'm1', sender: 'system', text: 'Mission TRK-8842 created. Dispatcher assigned.', timestamp: '17:30' },
    { id: 'm2', sender: 'dispatcher', text: 'Patient is a 45yo Male, severe chest pain. Cardiac history. Proceed with sirens.', timestamp: '17:31' },
    { id: 'm3', sender: 'driver', text: 'Copy that, en route. Estimated arrival 6 mins.', timestamp: '17:32' },
  ])

  const [broadcasts, setBroadcasts] = useState<Message[]>([
    { id: 'b1', sender: 'system', text: '⚠️ ROAD BLOCKAGE: Main St. closed due to construction. Detour via 5th Ave.', timestamp: '12:00' },
    { id: 'b2', sender: 'system', text: '🚨 WEATHER ALERT: Heavy rainfall expected. Drive with extreme caution.', timestamp: '15:30' },
  ])

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [directMessages, missionMessages, broadcasts, activeTab])

  const handleSendMessage = () => {
    if (!inputText.trim() && !file) return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'driver',
      text: inputText,
      timestamp: format(new Date(), 'HH:mm'),
    }

    if (file) {
      newMessage.fileUrl = '#'
      newMessage.fileName = file.name
    }

    if (activeTab === 'direct') {
      setDirectMessages((prev) => [...prev, newMessage])
    } else if (activeTab === 'mission') {
      if (!activeMission) {
        toast.error('No active mission chat room available')
        return
      }
      setMissionMessages((prev) => [...prev, newMessage])
    }

    setInputText('')
    setFile(null)
    toast.success('Message sent')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      toast.success(`Attached: ${e.target.files[0].name}`)
    }
  }

  const currentMessages =
    activeTab === 'direct'
      ? directMessages
      : activeTab === 'mission'
      ? missionMessages
      : broadcasts

  return (
    <DriverPageLayout title="Communication Center" mainClassName="driver-main--comms">
      <DriverModuleShell module={getModuleById('communications')!} description="Direct messaging, mission chat, emergency alerts, and file sharing with dispatch.">
        {/* Call Dispatcher Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-red-950 to-red-900 border border-red-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white animate-pulse">
              <Phone size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Emergency Dispatch</h4>
              <p className="text-xs text-red-300">Direct voice channel</p>
            </div>
          </div>
          <a
            href="tel:+1911"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Call Now
          </a>
        </div>

        {/* Chat Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-2 px-1 text-center text-xs font-bold rounded-lg transition-all ${
              activeTab === 'direct' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Direct Chat
          </button>
          <button
            onClick={() => setActiveTab('mission')}
            className={`py-2 px-1 text-center text-xs font-bold rounded-lg transition-all relative ${
              activeTab === 'mission' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mission Room
            {activeMission && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 px-1 text-center text-xs font-bold rounded-lg transition-all ${
              activeTab === 'broadcast' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Broadcasts
          </button>
        </div>

        {/* Chat Area */}
        <div className="driver-comms-chat flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden min-h-[350px]">
          {/* Active Mission Header in Mission Room */}
          {activeTab === 'mission' && (
            <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  {activeMission ? `Room: ${activeMission.trackingCode}` : 'No Active Mission'}
                </span>
              </div>
              {activeMission && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-red-950 text-red-400 px-2 py-0.5 rounded-full border border-red-900">
                  Active
                </span>
              )}
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[400px]">
            {activeTab === 'mission' && !activeMission ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShieldAlert className="w-12 h-12 text-zinc-600 mb-2" />
                <p className="text-sm font-bold text-zinc-400">Mission Room Locked</p>
                <p className="text-xs text-zinc-500 max-w-[200px] mt-1">
                  You must have an active emergency mission to access this channel.
                </p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <AlertCircle className="w-12 h-12 text-zinc-600 mb-2" />
                <p className="text-sm font-bold text-zinc-400">No Messages</p>
                <p className="text-xs text-zinc-500 mt-1">Secure communication channel is active.</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-full px-3 py-1 text-[10px] font-bold text-zinc-400 flex items-center gap-1.5 shadow-sm">
                        <Clock className="w-3 h-3" />
                        <span>{msg.text}</span>
                        <span className="text-zinc-600">·</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  )
                }

                const isMe = msg.sender === 'driver'
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                        isMe
                          ? 'bg-red-600 text-white rounded-tr-none'
                          : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none'
                      }`}
                    >
                      <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                      {msg.fileName && (
                        <div className="mt-2 p-2 bg-black/20 rounded-xl flex items-center justify-between gap-4 border border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="text-[10px] font-bold truncate text-zinc-300">{msg.fileName}</span>
                          </div>
                          <button className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <Download size={12} />
                          </button>
                        </div>
                      )}

                      <p className={`text-[9px] mt-1 text-right font-medium ${isMe ? 'text-red-200' : 'text-zinc-500'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {activeTab !== 'broadcast' && (activeTab !== 'mission' || activeMission) && (
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors shrink-0"
                title="Attach file"
              >
                <FileText size={18} />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type secure message..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder:text-zinc-500 outline-none focus:border-red-600 transition-colors"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
