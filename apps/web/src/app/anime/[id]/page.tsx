import Image from 'next/image'
import { Star } from 'lucide-react'
import { AnimeActions } from './AnimeActions'
import { AnimeBottomTabs } from './AnimeBottomTabs'

async function getAnime(id: string) {
  const res = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/anime/${id}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AnimePage({ params }: { params: { id: string } }) {
  const data = await getAnime(params.id)
  if (!data) return <div className="text-muted">Anime not found</div>

  const anime = data.Media

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      {anime.bannerImage && (
        <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
          <Image src={anime.bannerImage} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <div className="flex gap-6">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="relative w-40 h-56 rounded-xl overflow-hidden border border-border shadow-xl">
            <Image
              src={anime.coverImage.large}
              alt={anime.title.english || anime.title.romaji}
              fill
              className="object-cover"
            />
          </div>

          {/* Score */}
          {anime.averageScore && (
            <div className="mt-3 flex items-center justify-center gap-1.5 bg-surface rounded-lg p-2">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-lg font-bold text-white">{(anime.averageScore / 10).toFixed(1)}</span>
              <span className="text-xs text-muted">/10</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white mb-1">
            {anime.title.english || anime.title.romaji}
          </h1>
          {anime.title.romaji !== anime.title.english && (
            <p className="text-muted text-sm mb-3">{anime.title.romaji}</p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-sm text-muted mb-4">
            {anime.format && <span className="bg-surface-2 px-2.5 py-1 rounded-full">{anime.format}</span>}
            {anime.episodes && <span className="bg-surface-2 px-2.5 py-1 rounded-full">{anime.episodes} episodes</span>}
            {anime.status && <span className="bg-surface-2 px-2.5 py-1 rounded-full">{anime.status}</span>}
            {anime.seasonYear && <span className="bg-surface-2 px-2.5 py-1 rounded-full">{anime.season} {anime.seasonYear}</span>}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-4">
            {anime.genres?.map((g: string) => (
              <span key={g} className="text-xs bg-accent/20 text-accent-light border border-accent/30 px-2.5 py-1 rounded-full">
                {g}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4">
            {anime.description?.replace(/<[^>]*>/g, '')}
          </p>

          {/* Actions */}
          <AnimeActions animeId={anime.id} />
        </div>
      </div>

      <AnimeBottomTabs animeId={anime.id} totalEpisodes={anime.episodes ?? 0} />
    </div>
  )
}
