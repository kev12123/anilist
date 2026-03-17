'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'

interface EpisodeListProps {
  animeId: number
  totalEpisodes: number
}

function formatAiringDate(unixTs: number) {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function EpisodeList({ animeId, totalEpisodes }: EpisodeListProps) {
  const { data: threads } = useQuery({
    queryKey: ['episode-threads', animeId],
    queryFn: () => api.get(`/discussions/anime/${animeId}/episodes`).then(r => r.data),
  })

  // Fetch airing schedule to know which episodes have aired
  const { data: airingData } = useQuery({
    queryKey: ['airing', animeId],
    queryFn: () => api.get(`/anime/${animeId}/airing`).then(r => r.data),
  })

  const threadMap = new Map(
    (threads ?? []).map((t: any) => [t.episodeNumber, t])
  )

  // Build a map of episode -> airingAt timestamp
  const airingMap = new Map<number, number>(
    (airingData?.Media?.airingSchedule?.nodes ?? []).map((n: any) => [n.episode, n.airingAt])
  )

  const now = Math.floor(Date.now() / 1000)
  const episodes = Array.from({ length: totalEpisodes }, (_, i) => i + 1)

  // Split into aired and upcoming
  const aired = episodes.filter(ep => {
    const airingAt = airingMap.get(ep)
    // If no airing data at all (finished show), assume all aired
    if (airingMap.size === 0) return true
    // If we have airing data for this episode, check if it's in the past
    if (airingAt) return airingAt <= now
    // If no airing data for this specific ep but we have data for others, it may not be scheduled yet
    return false
  })

  const upcoming = episodes.filter(ep => {
    const airingAt = airingMap.get(ep)
    return airingAt && airingAt > now
  })

  return (
    <div className="mt-8">
      {/* Aired Episodes */}
      {aired.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Episodes <span className="text-muted text-sm font-normal">({aired.length} aired)</span>
          </h2>
          <div className="space-y-2">
            {aired.map(ep => {
              const thread = threadMap.get(ep) as any
              const replyCount = thread?._count?.replies ?? 0

              return (
                <Link
                  key={ep}
                  href={`/anime/${animeId}/episode/${ep}`}
                  className="flex items-center justify-between bg-surface hover:bg-surface-2 border border-border hover:border-accent/50 rounded-xl px-4 py-3 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted w-8">EP {ep}</span>
                    <span className="text-sm font-medium text-white group-hover:text-accent-light transition-colors">
                      Episode {ep} Discussion
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <MessageSquare size={14} />
                    <span className="text-xs">{replyCount}</span>
                    <ChevronRight size={14} className="group-hover:text-accent-light transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming Episodes */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            Upcoming <span className="text-muted text-sm font-normal">({upcoming.length} episodes)</span>
          </h2>
          <div className="space-y-2">
            {upcoming.map(ep => {
              const airingAt = airingMap.get(ep)!
              return (
                <div
                  key={ep}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted w-8">EP {ep}</span>
                    <span className="text-sm font-medium text-muted">Episode {ep}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted text-xs">
                    <Clock size={12} />
                    <span>{formatAiringDate(airingAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
