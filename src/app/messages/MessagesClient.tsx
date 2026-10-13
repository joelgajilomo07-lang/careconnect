'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getConversationsAction,
  getThreadMessagesAction,
  sendMessageAction,
} from '@/app/actions/messages'
import type {
  CareTeamConversation,
  ThreadMessage,
  ConversationParticipant,
} from '@/services/messagesService'
import {
  MessageSquare,
  Send,
  User,
  Shield,
  Search,
  ArrowLeft,
  Users,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCheck,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface MessagesClientProps {
  currentUserId: string
  currentUserRole: string
  currentUserName: string
}

const ROLE_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  admin: {
    label: 'Admin',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  doctor: {
    label: 'Doctor',
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
  },
  caregiver: {
    label: 'Caregiver',
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-200',
  },
  family_member: {
    label: 'Family',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  patient: {
    label: 'Patient',
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
}

export function MessagesClient({
  currentUserId,
  currentUserRole,
  currentUserName,
}: MessagesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlPatientId = searchParams.get('patientId')

  const [conversations, setConversations] = useState<CareTeamConversation[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    urlPatientId
  )
  const [searchTerm, setSearchTerm] = useState('')

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [patientInfo, setPatientInfo] = useState<{
    id: string
    full_name: string
    diagnosis?: string | null
  } | null>(null)
  const [participants, setParticipants] = useState<ConversationParticipant[]>([])

  const [inputContent, setInputContent] = useState('')
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forbiddenError, setForbiddenError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. Fetch conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversationsAction()
      if (res.data) {
        setConversations(res.data)
        // If no patient selected yet, default to first or URL param
        if (!selectedPatientId && res.data.length > 0) {
          const matched = urlPatientId
            ? res.data.find((c) => c.patientId === urlPatientId)
            : res.data[0]
          setSelectedPatientId(matched ? matched.patientId : res.data[0].patientId)
        }
      }
    } finally {
      setIsLoadingConversations(false)
    }
  }, [selectedPatientId, urlPatientId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // 2. Fetch thread messages when selectedPatientId changes
  const loadThread = useCallback(async (patientId: string) => {
    try {
      setIsLoadingMessages(true)
      setForbiddenError(null)

      const res = await getThreadMessagesAction(patientId)

      if (res.error) {
        if (res.code === '403') {
          setForbiddenError(
            '403 Forbidden: You do not have permission to view or message this patient’s care team.'
          )
        } else {
          setForbiddenError(res.error)
        }
        setMessages([])
        setPatientInfo(null)
        setParticipants([])
        return
      }

      if (res.data) {
        setPatientInfo(res.data.patient)
        setMessages(res.data.messages)
        setParticipants(res.data.participants)
        setTimeout(scrollToBottom, 50)
      }
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatientId) {
      loadThread(selectedPatientId)
    }
  }, [selectedPatientId, loadThread])

  // 3. Realtime subscription to messages for the selected patient + 5s polling fallback
  useEffect(() => {
    if (!selectedPatientId) return

    const supabase = supabaseRef.current
    const channelName = `careteam-messages:${selectedPatientId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${selectedPatientId}`,
        },
        async () => {
          // Re-fetch thread to ensure relations (sender name/role) are populated
          loadThread(selectedPatientId)
        }
      )
      .subscribe()

    // 5-second polling interval for real-time responsiveness fallback
    const pollTimer = setInterval(() => {
      loadThread(selectedPatientId)
    }, 5000)

    return () => {
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [selectedPatientId, loadThread])

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !inputContent.trim() || isSending) return

    const content = inputContent.trim()
    setInputContent('')
    setIsSending(true)

    try {
      const res = await sendMessageAction(selectedPatientId, content)

      if (res.error) {
        alert(res.error)
        setInputContent(content)
      } else if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data!.id)) return prev
          return [...prev, res.data!]
        })
        setTimeout(scrollToBottom, 50)
        // Refresh conversations list to update last message preview
        loadConversations()
      }
    } finally {
      setIsSending(false)
    }
  }

  // Filter conversations by patient name
  const filteredConversations = conversations.filter((c) =>
    c.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeConversation = conversations.find(
    (c) => c.patientId === selectedPatientId
  )

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E2243] tracking-tight">
          Care Team Messages
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Secure, HIPAA & RA 10173 compliant communication between doctors, caregivers, patients, and family members.
        </p>
      </div>

      {/* Main Two-Column Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[calc(100vh-14rem)] min-h-[580px]">
        {/* Left Column: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 flex flex-col shrink-0 bg-slate-50/50 ${
            selectedPatientId && !forbiddenError ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search box */}
          <div className="p-3.5 border-b border-slate-200/70 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient care team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#1E2243] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8]"
              />
            </div>
          </div>

          {/* Conversations Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#5B5FE8] mb-2" />
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-[#1E2243]">
                  No care team conversations
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are not currently linked to any active patient care teams.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.patientId === selectedPatientId
                const initial = conv.patientName[0]?.toUpperCase() || 'P'

                return (
                  <button
                    key={conv.patientId}
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(conv.patientId)
                      router.push(`/messages?patientId=${conv.patientId}`)
                    }}
                    className={`w-full p-4 text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEF0FF] border-l-4 border-[#5B5FE8]'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected
                          ? 'bg-[#5B5FE8] text-white shadow-xs'
                          : 'bg-slate-100 text-[#1E2243]'
                      }`}
                    >
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-[#5B5FE8]' : 'text-[#1E2243]'
                          }`}
                        >
                          {conv.patientName}
                        </h4>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatDistanceToNow(
                              new Date(conv.lastMessage.created_at),
                              { addSuffix: false }
                            )}
                          </span>
                        )}
                      </div>

                      {conv.diagnosis && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {conv.diagnosis}
                        </p>
                      )}

                      <div className="mt-1">
                        {conv.lastMessage ? (
                          <p className="text-xs text-slate-600 truncate leading-snug">
                            <span className="font-semibold text-slate-700">
                              {conv.lastMessage.sender_name.split(' ')[0]}:{' '}
                            </span>
                            {conv.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No messages yet. Start the conversation.
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {forbiddenError ? (
            /* 403 Access Forbidden Display */
            <div className="flex-1 flex items-center justify-center p-8 bg-rose-50/40">
              <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-md p-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-rose-100 text-[#F25F5C] flex items-center justify-center mx-auto ring-4 ring-rose-50">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E2243]">
                    403 – Access Forbidden
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {forbiddenError}
                  </p>
                </div>
                {conversations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(conversations[0].patientId)
                      router.push(`/messages?patientId=${conversations[0].patientId}`)
                    }}
                    className="px-4 py-2 rounded-xl bg-[#5B5FE8] text-white text-xs font-bold hover:bg-[#4A4ED4] transition-colors"
                  >
                    Go to My Care Team
                  </button>
                )}
              </div>
            </div>
          ) : !selectedPatientId ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              <div>
                <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-[#1E2243]">
                  Select a Conversation
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Choose a patient care team from the left to read and send messages.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedPatientId(null)}
                    className="md:hidden p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="h-10 w-10 rounded-full bg-[#EEF0FF] text-[#5B5FE8] flex items-center justify-center font-bold text-sm shrink-0">
                    {patientInfo?.full_name?.[0]?.toUpperCase() || 'P'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-[#1E2243] truncate">
                        {patientInfo?.full_name || 'Care Team'}
                      </h2>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold hidden sm:inline-block">
                        Care Team Thread
                      </span>
                    </div>
                    {patientInfo?.diagnosis && (
                      <p className="text-xs text-slate-500 truncate">
                        {patientInfo.diagnosis}
                      </p>
                    )}
                  </div>
                </div>

                {/* Participants Avatars / Roles Summary */}
                <div className="hidden lg:flex items-center gap-1.5 flex-wrap justify-end max-w-sm">
                  {participants.slice(0, 4).map((p) => {
                    const badge = ROLE_BADGES[p.role] || {
                      label: p.role,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    }
                    return (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        title={`${p.full_name} (${badge.label})`}
                      >
                        <span className="truncate max-w-[80px]">
                          {p.full_name.split(' ')[0]}
                        </span>
                        <span className="opacity-70 font-bold">[{badge.label}]</span>
                      </span>
                    )
                  })}
                  {participants.length > 4 && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      +{participants.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
                {isLoadingMessages ? (
                  <div className="p-8 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#5B5FE8] mb-2" />
                    <p className="text-xs">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-[#1E2243]">
                      No messages yet in this care team
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Send an update or question below. Doctors, caregivers, and family members in this care team will receive a notification.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    const senderBadge = ROLE_BADGES[msg.sender.role] || {
                      label: msg.sender.role,
                      bg: 'bg-slate-100',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isOwn ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* Sender info & badge */}
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs font-bold text-[#1E2243]">
                            {isOwn ? 'You' : msg.sender.full_name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${senderBadge.bg} ${senderBadge.text} ${senderBadge.border}`}
                          >
                            {senderBadge.label}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-md sm:max-w-lg rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs ${
                            isOwn
                              ? 'bg-[#EEF0FF] text-[#1E2243] border border-[#5B5FE8]/20 rounded-tr-xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-200/80 bg-white flex items-end gap-2"
              >
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    placeholder={`Message ${
                      patientInfo?.full_name ? `${patientInfo.full_name}'s` : ''
                    } care team (Enter to send)...`}
                    maxLength={2000}
                    className="w-full resize-none p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1E2243] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FE8]/30 focus:border-[#5B5FE8] leading-relaxed"
                  />
                  <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">
                    {inputContent.length}/2000
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputContent.trim() || isSending}
                  className="h-10 px-4 rounded-xl bg-[#5B5FE8] hover:bg-[#4A4ED4] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
