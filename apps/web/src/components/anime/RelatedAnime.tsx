'use client'

import Link from 'next/link'
import { clsx } from 'clsx'

interface MediaNode {
  id: number
  title: { english?: string; romaji: string }
  coverImage: { large?: string; medium?: string }
  averageScore?: number
  episodes?: number
  status?: string
  format?: string
}

interface RelationEdge {
  relationType: string
  node: MediaNode & { type: string }
}

interface Props {
  relations?: { edges: RelationEdge[] }
  recommendations?: { nodes: { mediaRecommendation: MediaNode | null }[] }
}

const RELATION_PRIORITY = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ADAPTATION', 'ALTERNATIVE']

function MediaCard({ media, badge }: { media: MediaNode; badge?: string }) {
  return (
    <Link href={`/anime/${media.id}`} className="group flex-shrink-0 w-28">
      <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-surface mb-2">
        <img
          src={media.coverImage.large || media.coverImage.medium}
          alt={media.title.english || media.title.romaji}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {badge && (
          <div className="absolute top-1.5 left-1.5 bg-black/80 text-[9px] font-bold text-accent-light px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            {badge.replace(/_/g, ' ')}
          </div>
        )}
        {media.averageScore && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-[10px] font-bold text-yellow-400 px-1.5 py-0.5 rounded-md">
            {media.averageScore}%
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-300 leading-tight line-clamp-2 group-hover:text-white transition-colors">
        {media.title.english || media.title.romaji}
      </p>
    </Link>
  )
}

export function RelatedAnime({ relations, recommendations }: Props) {
  // Filter to anime-only relations, sorted by priority
  const relatedEdges = (relations?.edges ?? [])
    .filter(e => e.node.type === 'ANIME')
    .sort((a, b) => {
      const ai = RELATION_PRIORITY.indexOf(a.relationType)
      const bi = RELATION_PRIORITY.indexOf(b.relationType)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  const recommended = (recommendations?.nodes ?? [])
    .map(n => n.mediaRecommendation)
    .filter(Boolean) as MediaNode[]

  if (!relatedEdges.length && !recommended.length) return null

  return (
    <div className="mt-10 space-y-8">
      {relatedEdges.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Related</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {relatedEdges.map(edge => (
              <MediaCard key={edge.node.id} media={edge.node} badge={edge.relationType} />
            ))}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">You Might Also Like</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {recommended.map(media => (
              <MediaCard key={media.id} media={media} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
