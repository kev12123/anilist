'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import Link from 'next/link'
import { clsx } from 'clsx'

interface Notification {
  id: string
  type: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, string> = {
  FOLLOW: '👤',
  REPLY: '💬',
  LIKE: '❤️',
  MESSAGE: '✉️',
}

export function NotificationBell() {
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Listen for real-time notification pushes
  useEffect(() => {
    if (!user?.id) return
    const socket = getSocket(user.id)
    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notif-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })
    return () => { socket.off('notification:new') }
  }, [user?.id])

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    enabled: mounted && !!token,
    refetchInterval: 60000,
  })

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: open && !!token,
  })

  const { mutate: readAll } = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unread = countData?.count ?? 0

  if (!mounted || !token) return null

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(s => !s)}
        className="relative p-2 rounded-lg text-muted hover:text-white hover:bg-surface-2 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-2 border border-border rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={() => readAll()} className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
                <Bell size={28} className="opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotifItem key={n.id} notif={n} onRead={() => {
                  queryClient.invalidateQueries({ queryKey: ['notif-count'] })
                  queryClient.invalidateQueries({ queryKey: ['notifications'] })
                }} onClose={() => setOpen(false)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotifItem({ notif, onRead, onClose }: { notif: Notification; onRead: () => void; onClose: () => void }) {
  const markRead = async () => {
    if (!notif.read) {
      await api.patch(`/notifications/${notif.id}/read`)
      onRead()
    }
  }

  const content = (
    <div className={clsx('flex items-start gap-3 px-4 py-3 hover:bg-surface transition-colors', !notif.read && 'bg-accent/5')}>
      <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[notif.type] ?? '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm leading-snug', notif.read ? 'text-zinc-400' : 'text-white')}>{notif.message}</p>
        <p className="text-[10px] text-muted mt-0.5">{new Date(notif.createdAt).toLocaleString()}</p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
      )}
    </div>
  )

  if (notif.link) {
    return (
      <Link href={notif.link} onClick={() => { markRead(); onClose() }}>
        {content}
      </Link>
    )
  }
  return <div onClick={markRead}>{content}</div>
}
