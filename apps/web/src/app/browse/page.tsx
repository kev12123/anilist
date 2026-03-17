'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Tv, Users } from 'lucide-react'
import { AnimeCard } from '@/components/anime/AnimeCard'
import { api } from '@/lib/api'
import Link from 'next/link'
import { clsx } from 'clsx'

type Tab = 'anime' | 'users'

export default function BrowsePage() {
  const [tab, setTab] = useState<Tab>('anime')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: query ? ['search', query] : ['trending'],
    queryFn: () =>
      query
        ? api.get(`/anime/search?q=${encodeURIComponent(query)}`).then(r => r.data)
        : api.get('/anime/trending').then(r => r.data),
    enabled: tab === 'anime',
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['user-search', query],
    queryFn: () => api.get(`/users/find/search?q=${encodeURIComponent(query)}`).then(r => r.data),
    enabled: tab === 'users' && query.length >= 2,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(input)
  }

  const anime = animeData?.Page?.media ?? []

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Browse</h1>

        {/* Tab toggle */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit mb-4">
          {([
            { key: 'anime', label: 'Anime', icon: Tv },
            { key: 'users', label: 'Users', icon: Users },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setQuery(''); setInput('') }}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === key ? 'bg-accent text-white' : 'text-muted hover:text-white'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Search box */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={tab === 'anime' ? 'Search anime...' : 'Search users...'}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Anime results */}
      {tab === 'anime' && (
        animeLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-xl aspect-[2/3] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              {query ? `Results for "${query}"` : 'Trending anime'} · {anime.length} results
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {anime.map((a: any) => (
                <AnimeCard
                  key={a.id}
                  id={a.id}
                  title={a.title.english || a.title.romaji}
                  coverImage={a.coverImage.large}
                  score={a.averageScore}
                  episodes={a.episodes}
                  status={a.status}
                  genres={a.genres}
                />
              ))}
            </div>
          </>
        )
      )}

      {/* User results */}
      {tab === 'users' && (
        <div>
          {!query || query.length < 2 ? (
            <div className="text-center py-20 text-muted">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Type at least 2 characters to search for users</p>
            </div>
          ) : usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="text-center py-20 text-muted">
              <p>No users found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted mb-4">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
              {users.map((u: any) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-4 bg-surface hover:bg-surface-2 border border-border hover:border-accent/50 rounded-xl px-4 py-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent-light flex-shrink-0">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.username} className="w-full h-full rounded-full object-cover" />
                      : u.username[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-accent-light transition-colors">
                      {u.username}
                    </p>
                    {u.bio && (
                      <p className="text-xs text-muted truncate mt-0.5">{u.bio}</p>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted flex-shrink-0">
                    <span>{u._count?.followers ?? 0} followers</span>
                    <span>{u._count?.reviews ?? 0} reviews</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
