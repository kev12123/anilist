'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { Send, MessageSquare, ArrowLeft, SquarePen, Search, X } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

interface Message {
  id: string
  senderId: string
  receiverId: string
  body: string
  read: boolean
  createdAt: string
  sender: { id: string; username: string; avatar?: string }
}

interface Conversation {
  partner: { id: string; username: string; avatar?: string }
  lastMessage: Message
  unread: number
}

function Avatar({ user, size = 'md' }: { user: { username: string; avatar?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={clsx('rounded-full bg-accent/30 flex items-center justify-center font-bold text-accent-light flex-shrink-0', sz)}>
      {user.avatar
        ? <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
        : user.username[0]?.toUpperCase()
      }
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function NewConversationModal({ onSelect, onClose }: { onSelect: (user: Conversation['partner']) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Conversation['partner'][]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      api.get(`/users/find/search?q=${encodeURIComponent(query)}`).then(r => {
        setResults(r.data)
      }).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Close on backdrop click
  const backdropRef = useRef<HTMLDivElement>(null)
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div ref={backdropRef} onClick={handleBackdrop} className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search size={15} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none"
          />
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted text-sm gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 && query.trim().length >= 2 ? (
            <div className="text-center py-8 text-muted text-sm">No users found</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Type to search for a user</div>
          ) : (
            results.map(u => (
              <button
                key={u.id}
                onClick={() => { onSelect(u); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
              >
                <Avatar user={u} size="sm" />
                <span className="text-sm font-medium text-white">{u.username}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { user, token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activePartner, setActivePartner] = useState<Conversation['partner'] | null>(null)
  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showNewConvo, setShowNewConvo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Connect socket
  useEffect(() => {
    if (!user?.id) return
    const socket = getSocket(user.id)
    socketRef.current = socket

    socket.on('message:received', (msg: Message) => {
      // Update conversation list
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // If this is the open conversation, append to chat
      setChatMessages(prev => {
        const isActive = activePartnerRef.current?.id === msg.senderId
        if (isActive) return [...prev, msg]
        return prev
      })
    })

    socket.on('message:sent', (msg: Message) => {
      setChatMessages(prev => {
        // Avoid duplicates (optimistic + confirmed)
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    return () => {
      socket.off('message:received')
      socket.off('message:sent')
    }
  }, [user?.id])

  // Keep a ref to activePartner for use inside socket callbacks
  const activePartnerRef = useRef(activePartner)
  useEffect(() => { activePartnerRef.current = activePartner }, [activePartner])

  // Load conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then(r => r.data),
    enabled: mounted && !!token,
    refetchInterval: 30000,
  })

  // Auto-open conversation when coming from ?user= (e.g. profile Message button)
  // Fire as soon as we're mounted + authed — don't wait for conversations to load
  useEffect(() => {
    const userId = searchParams.get('user')
    if (!userId || !mounted || !token) return
    api.get(`/users/by-id/${userId}`).then(r => {
      setActivePartner({ id: r.data.id, username: r.data.username, avatar: r.data.avatar })
      router.replace('/messages')
    }).catch(() => {})
  }, [mounted, token])

  // Load message thread when partner changes
  useEffect(() => {
    if (!activePartner) return
    setChatMessages([])
    api.get(`/messages/${activePartner.id}`).then(r => {
      setChatMessages(r.data)
      // Mark as read
      socketRef.current?.emit('message:read', { senderId: activePartner.id })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })
  }, [activePartner?.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const sendMessage = () => {
    if (!draft.trim() || !activePartner || !socketRef.current) return
    setSending(true)

    // Optimistic append
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderId: user!.id,
      receiverId: activePartner.id,
      body: draft.trim(),
      read: false,
      createdAt: new Date().toISOString(),
      sender: user as any,
    }
    setChatMessages(prev => [...prev, optimistic])
    setDraft('')

    socketRef.current.emit('message:send', { receiverId: activePartner.id, body: optimistic.body })
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!mounted) return null

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <MessageSquare size={48} className="mx-auto text-muted mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Sign in to view messages</h2>
        <button onClick={() => openAuthModal()} className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
          Sign in
        </button>
      </div>
    )
  }

  return (
    <>
    {showNewConvo && (
      <NewConversationModal
        onSelect={partner => { setActivePartner(partner); setShowNewConvo(false) }}
        onClose={() => setShowNewConvo(false)}
      />
    )}
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversation list */}
      <div className={clsx(
        'w-80 flex-shrink-0 bg-surface border border-border rounded-xl flex flex-col',
        activePartner ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Messages</h2>
          <button
            onClick={() => setShowNewConvo(true)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-2 transition-colors"
            title="New conversation"
          >
            <SquarePen size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-2 px-4 text-center">
              <MessageSquare size={32} />
              <p className="text-sm">No conversations yet.<br />Hit the <SquarePen size={12} className="inline" /> button to start one.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.partner.id}
                onClick={() => setActivePartner(conv.partner)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors border-b border-border/50',
                  activePartner?.id === conv.partner.id && 'bg-surface-2'
                )}
              >
                <Avatar user={conv.partner} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white truncate">{conv.partner.username}</span>
                    <span className="text-xs text-muted flex-shrink-0 ml-2">{formatTime(conv.lastMessage.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted truncate">
                      {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}{conv.lastMessage.body}
                    </p>
                    {conv.unread > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                        {conv.unread > 9 ? '9+' : conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={clsx(
        'flex-1 bg-surface border border-border rounded-xl flex flex-col',
        !activePartner ? 'hidden md:flex' : 'flex'
      )}>
        {!activePartner ? (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <MessageSquare size={40} />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              <button
                onClick={() => setActivePartner(null)}
                className="md:hidden text-muted hover:text-white transition-colors mr-1"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar user={activePartner} size="sm" />
              <Link href={`/profile/${activePartner.username}`} className="text-sm font-semibold text-white hover:text-accent-light transition-colors">
                {activePartner.username}
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted gap-2">
                  <p className="text-sm">Say hi to {activePartner.username}!</p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.senderId === user?.id
                  return (
                    <div key={msg.id} className={clsx('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                      {!isMe && <Avatar user={msg.sender} size="sm" />}
                      <div className={clsx(
                        'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
                        isMe
                          ? 'bg-accent text-white rounded-tr-sm'
                          : 'bg-surface-2 text-zinc-200 rounded-tl-sm'
                      )}>
                        <p className="leading-relaxed break-words">{msg.body}</p>
                        <p className={clsx('text-[10px] mt-1', isMe ? 'text-white/60 text-right' : 'text-muted')}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activePartner.username}...`}
                  rows={1}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted resize-none focus:outline-none focus:border-accent transition-colors"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className="p-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[10px] text-muted mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
