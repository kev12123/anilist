'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { MessageSquare, Plus, ChevronRight, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { clsx } from 'clsx'

interface DiscussionListProps {
  animeId: number
}

export function DiscussionList({ animeId }: DiscussionListProps) {
  const { token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['discussions', animeId],
    queryFn: () => api.get(`/anime/${animeId}/discussions`).then(r => r.data),
  })

  const { mutate: createThread, isPending } = useMutation({
    mutationFn: () => api.post('/discussions', { anilistId: animeId, title, body }),
    onSuccess: () => {
      setTitle('')
      setBody('')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['discussions', animeId] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    createThread()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Discussions</h2>
        <button
          onClick={() => {
            if (!token) { openAuthModal('Sign in to start a discussion.'); return }
            setShowForm(s => !s)
          }}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            showForm ? 'bg-surface-2 text-muted border border-border' : 'bg-accent hover:bg-accent-hover text-white'
          )}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Thread'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Thread Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              maxLength={200}
              autoFocus
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Share your thoughts, theories, questions..."
              rows={4}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !title.trim() || !body.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {isPending ? 'Posting...' : 'Post Thread'}
            </button>
          </div>
        </form>
      )}

      {/* Thread list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !discussions?.length ? (
        <div className="text-center py-16 text-muted">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No discussions yet. Be the first to start one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {discussions.map((d: any) => (
            <Link
              key={d.id}
              href={`/anime/${animeId}/discussion/${d.id}`}
              className="flex items-center justify-between bg-surface hover:bg-surface-2 border border-border hover:border-accent/50 rounded-xl px-4 py-3 transition-all group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-accent-light transition-colors truncate">
                  {d.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span>{d.user?.username}</span>
                  <span>·</span>
                  <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={11} />
                    {d._count?.replies ?? 0}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted group-hover:text-accent-light transition-colors flex-shrink-0 ml-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
