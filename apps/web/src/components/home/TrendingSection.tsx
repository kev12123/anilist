'use client'

import { useQuery } from '@tanstack/react-query'
import { AnimeCard } from '@/components/anime/AnimeCard'
import { api } from '@/lib/api'

export function TrendingSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/anime/trending').then(r => r.data),
  })

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Trending Now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl aspect-[2/3] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const anime = data?.Page?.media ?? []

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Trending Now</h2>
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
    </div>
  )
}
