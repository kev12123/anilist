'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LogOut, List, Star, MessageSquare, Settings } from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'

export function RightPanel() {
  const { token, user, setToken, setUser } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setMounted(true) }, [])

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => api.get(`/users/${user?.username}`).then(r => r.data),
    enabled: mounted && !!token && !!user?.username,
  })

  const handleSignOut = () => {
    setToken(null)
    setUser(null)
    window.location.href = '/'
  }

  if (!mounted || !token || !user) return null
  if (pathname.startsWith('/profile')) return null
  if (pathname.startsWith('/settings')) return null

  return (
    <aside className="fixed right-0 top-0 h-screen w-60 bg-surface border-l border-border flex flex-col z-40">
      {/* Top bar: notifications */}
      <div className="px-3 py-3 border-b border-border flex justify-end">
        <NotificationBell />
      </div>

      {/* Profile header */}
      <div className="px-5 py-5 border-b border-border">
        <Link href={`/profile/${user.username}`} className="flex flex-col items-center gap-3 group">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center text-2xl font-bold text-accent-light border-2 border-accent/40 group-hover:border-accent transition-colors">
            {user.username[0].toUpperCase()}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white group-hover:text-accent-light transition-colors">
              {user.username}
            </p>
            <p className="text-xs text-muted mt-0.5">View profile</p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      {profile && (
        <div className="px-5 py-4 border-b border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Reviews', value: profile._count?.reviews ?? 0, tab: 'reviews' },
              { label: 'Followers', value: profile._count?.followers ?? 0, tab: 'followers' },
              { label: 'Following', value: profile._count?.following ?? 0, tab: 'following' },
            ].map(stat => (
              <Link
                key={stat.label}
                href={`/profile/${user.username}?tab=${stat.tab}`}
                className="bg-surface-2 rounded-lg px-2 py-3 hover:bg-border transition-colors"
              >
                <p className="text-sm font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-muted mt-0.5">{stat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/mylist"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-surface-2 transition-colors"
        >
          <List size={16} />
          My List
        </Link>
        <Link
          href="/messages"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-surface-2 transition-colors"
        >
          <MessageSquare size={16} />
          Messages
        </Link>
        <Link
          href={`/profile/${user.username}?tab=reviews`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-surface-2 transition-colors"
        >
          <Star size={16} />
          My Reviews
        </Link>
      </nav>

      {/* Settings + Sign out */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-white hover:bg-surface-2 transition-colors"
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
