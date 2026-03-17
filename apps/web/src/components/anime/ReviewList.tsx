'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Star, Plus, X, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { clsx } from 'clsx'

interface ReviewListProps {
  animeId: number
}

export function ReviewList({ animeId }: ReviewListProps) {
  const { token, user, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [score, setScore] = useState(0)
  const [body, setBody] = useState('')

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['anime-reviews', animeId],
    queryFn: () => api.get(`/anime/${animeId}/reviews`).then(r => r.data),
  })

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: () => api.post('/reviews', { anilistId: animeId, score, body }),
    onSuccess: () => {
      setScore(0)
      setBody('')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['anime-reviews', animeId] })
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
    },
  })

  const { mutate: deleteReview } = useMutation({
    mutationFn: (id: string) => api.delete(`/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime-reviews', animeId] })
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!score || !body.trim()) return
    submitReview()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Reviews</h2>
        <button
          onClick={() => {
            if (!token) { openAuthModal('Sign in to write a review.'); return }
            setShowForm(s => !s)
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            showForm ? 'bg-surface-2 text-muted border border-border' : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'Write Review'}
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 mb-4 space-y-4">
          {/* Score picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">Your Score</label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                    score === n
                      ? 'bg-accent text-white scale-110'
                      : 'bg-surface-2 text-muted hover:text-white hover:bg-border'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Review body */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Review</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Share your thoughts on this anime..."
              rows={5}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !score || !body.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {isPending ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !reviews?.length ? (
        <div className="text-center py-16 text-muted">
          <Star size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reviews yet. Be the first to review this anime!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <Link href={`/profile/${r.user?.username}`}>
                    <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light">
                      {r.user?.username?.[0]?.toUpperCase()}
                    </div>
                  </Link>
                  <div>
                    <Link href={`/profile/${r.user?.username}`} className="text-sm font-semibold text-white hover:text-accent-light transition-colors">
                      {r.user?.username}
                    </Link>
                    <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 px-2.5 py-1 rounded-lg">
                    <Star size={13} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-yellow-300">{r.score}/10</span>
                  </div>
                  {user?.id === r.userId && (
                    <button onClick={() => deleteReview(r.id)} className="text-muted hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
