'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Tv, Users, ChevronDown, X } from 'lucide-react'
import { AnimeCard } from '@/components/anime/AnimeCard'
import { api } from '@/lib/api'
import Link from 'next/link'
import { clsx } from 'clsx'

type Tab = 'anime' | 'users'

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
]



const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i)

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
          value
            ? 'bg-accent/20 border-accent text-accent-light'
            : 'bg-surface border-border text-muted hover:text-white hover:border-accent/50'
        )}
      >
        {selected?.label ?? label}
        <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-48 bg-surface-2 border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-muted hover:bg-surface hover:text-white transition-colors"
            >
              Any {label}
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-zinc-300 hover:bg-surface hover:text-white'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BrowsePage() {
  const [tab, setTab] = useState<Tab>('anime')
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced autocomplete query
  const { data: suggestions } = useQuery({
    queryKey: ['autocomplete', input],
    queryFn: () => api.get(`/anime/search?q=${encodeURIComponent(input)}&page=1`).then(r =>
      (r.data?.Page?.media ?? []).slice(0, 6)
    ),
    enabled: tab === 'anime' && input.trim().length >= 2,
    staleTime: 30000,
  })

  const hasFilters = !!(genre || year)

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ['browse-anime', query, genre, year, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (genre) params.set('genre', genre)
      if (year) params.set('year', year)
      params.set('page', String(page))
      const hasSearch = query || genre || year
      return hasSearch
        ? api.get(`/anime/search?${params.toString()}`).then(r => r.data)
        : api.get(`/anime/trending?page=${page}`).then(r => r.data)
    },
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
    setPage(1)
    setShowSuggestions(false)
  }

  const clearFilters = () => {
    setGenre('')
    setYear('')
    setPage(1)
  }

  const anime = animeData?.Page?.media ?? []
  const pageInfo = animeData?.Page?.pageInfo

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
              onClick={() => { setTab(key); setQuery(''); setInput(''); clearFilters() }}
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

        {/* Search + filters */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-3">
            <div ref={searchRef} className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={tab === 'anime' ? 'Search anime...' : 'Search users...'}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              {/* Autocomplete dropdown */}
              {tab === 'anime' && showSuggestions && input.trim().length >= 2 && suggestions?.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-2 border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                  {suggestions.map((a: any) => (
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={() => {
                        const title = a.title.english || a.title.romaji
                        setInput(title)
                        setQuery(title)
                        setPage(1)
                        setShowSuggestions(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface transition-colors text-left"
                    >
                      <img src={a.coverImage.medium} alt={a.title.english || a.title.romaji} className="w-8 h-10 rounded object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{a.title.english || a.title.romaji}</p>
                        <p className="text-xs text-muted">{a.seasonYear ?? ''}{a.genres?.[0] ? ` · ${a.genres[0]}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters row — anime only */}
          {tab === 'anime' && (
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                label="Genre"
                value={genre}
                options={GENRES.map(g => ({ label: g, value: g }))}
                onChange={v => { setGenre(v); setPage(1) }}
              />
              <FilterDropdown
                label="Year"
                value={year}
                options={YEARS.map(y => ({ label: String(y), value: String(y) }))}
                onChange={v => { setYear(v); setPage(1) }}
              />
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors px-2 py-2"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}
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
              {query || hasFilters
                ? `${query ? `Results for "${query}"` : 'Filtered results'}${genre ? ` · ${genre}` : ''}${year ? ` · ${year}` : ''}`
                : 'Trending anime'
              } · {anime.length} results
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

            {/* Pagination */}
            {pageInfo && (pageInfo.currentPage > 1 || pageInfo.hasNextPage) && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-muted hover:text-white hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-muted">
                  Page {pageInfo.currentPage}{pageInfo.lastPage ? ` of ${pageInfo.lastPage}` : ''}
                </span>
                <button
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={!pageInfo.hasNextPage}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-muted hover:text-white hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
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
