'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { AnimeCard } from '@/components/anime/AnimeCard'
import { LogIn } from 'lucide-react'

const STATUSES = [
  { key: 'WATCHING', label: 'Watching' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PLAN_TO_WATCH', label: 'Plan to Watch' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'DROPPED', label: 'Dropped' },
]

export default function MyListPage() {
  const { token, openAuthModal } = useAuthStore()
  const [activeTab, setActiveTab] = useState('WATCHING')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: entries, isLoading } = useQuery({
    queryKey: ['mylist'],
    queryFn: () => api.get('/users/me/list').then(r => r.data),
    enabled: !!token && mounted,
  })

  if (!mounted) return null

  const filtered = entries?.filter((e: any) => e.status === activeTab) ?? []

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
          <LogIn size={28} className="text-accent-light" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sign in to see your list</h2>
        <p className="text-muted text-sm mb-5">Track anime you're watching, completed, or planning to watch.</p>
        <button
          onClick={() => openAuthModal()}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">My List</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 w-fit">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === s.key
                ? 'bg-accent text-white'
                : 'text-muted hover:text-white'
            }`}
          >
            {s.label}
            {entries && (
              <span className="ml-1.5 text-xs opacity-70">
                ({entries.filter((e: any) => e.status === s.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl aspect-[2/3] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-2">Nothing here yet</p>
          <p className="text-sm">Go browse anime and add them to your list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((entry: any) => (
            entry.anime ? (
              <div key={entry.anilistId} className="relative">
                <AnimeCard
                  id={entry.anilistId}
                  title={entry.anime.title?.english || entry.anime.title?.romaji}
                  coverImage={entry.anime.coverImage?.large}
                  score={entry.score ? entry.score * 10 : entry.anime.averageScore}
                  episodes={entry.anime.episodes}
                />
                {entry.status === 'WATCHING' && entry.anime.episodes && (
                  <div className="mt-1.5 px-1">
                    <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
                      <span>Progress</span>
                      <span>{entry.progress ?? 0}/{entry.anime.episodes}</span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((entry.progress ?? 0) / entry.anime.episodes) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  )
}
