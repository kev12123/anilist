'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { EpisodeList } from '@/components/anime/EpisodeList'
import { DiscussionList } from '@/components/anime/DiscussionList'
import { ReviewList } from '@/components/anime/ReviewList'
import { List, MessageSquare, Star } from 'lucide-react'

interface AnimeBottomTabsProps {
  animeId: number
  totalEpisodes: number
}

type Tab = 'episodes' | 'discussions' | 'reviews'

export function AnimeBottomTabs({ animeId, totalEpisodes }: AnimeBottomTabsProps) {
  const [tab, setTab] = useState<Tab>(totalEpisodes > 0 ? 'episodes' : 'discussions')

  const tabs = [
    ...(totalEpisodes > 0 ? [{ key: 'episodes' as Tab, label: 'Episodes', icon: List }] : []),
    { key: 'discussions' as Tab, label: 'Discussions', icon: MessageSquare },
    { key: 'reviews' as Tab, label: 'Reviews', icon: Star },
  ]

  return (
    <div className="mt-8">
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
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

      {tab === 'episodes' && totalEpisodes > 0 && <EpisodeList animeId={animeId} totalEpisodes={totalEpisodes} />}
      {tab === 'discussions' && <DiscussionList animeId={animeId} />}
      {tab === 'reviews' && <ReviewList animeId={animeId} />}
    </div>
  )
}
