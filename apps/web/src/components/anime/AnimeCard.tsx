import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface AnimeCardProps {
  id: number
  title: string
  coverImage?: string
  score?: number
  episodes?: number
  status?: string
  genres?: string[]
}

export function AnimeCard({ id, title, coverImage, score, episodes, status, genres }: AnimeCardProps) {
  return (
    <Link href={`/anime/${id}`} className="group block">
      <div className="bg-surface rounded-xl overflow-hidden border border-border hover:border-accent transition-all duration-200 hover:shadow-lg hover:shadow-accent/10">
        <div className="relative aspect-[2/3] overflow-hidden bg-surface-2">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs px-2 text-center">
              No image
            </div>
          )}
          {score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-white">{(score / 10).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight mb-1 group-hover:text-accent-light transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted">
            {episodes && <span>{episodes} eps</span>}
            {status && <span>· {status}</span>}
          </div>
          {genres && genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
