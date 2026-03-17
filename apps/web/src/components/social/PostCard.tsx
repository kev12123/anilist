'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageSquare, Trash2, Send } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { clsx } from 'clsx'

interface PostCardProps {
  post: any
  feedKey: string[]
}

export function PostCard({ post, feedKey }: PostCardProps) {
  const { user, token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [commentBody, setCommentBody] = useState('')

  const isLiked = post.likes?.some((l: any) => l.userId === user?.id)
  const isOwn = post.user?.id === user?.id

  const { mutate: toggleLike } = useMutation({
    mutationFn: () => api.post(`/posts/${post.id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKey }),
  })

  const { mutate: deletePost } = useMutation({
    mutationFn: () => api.delete(`/posts/${post.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKey }),
  })

  const { mutate: addComment, isPending } = useMutation({
    mutationFn: (body: string) => api.post(`/posts/${post.id}/comments`, { body }),
    onSuccess: () => {
      setCommentBody('')
      queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })

  const handleLike = () => {
    if (!token) { openAuthModal('Sign in to like posts.'); return }
    toggleLike()
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { openAuthModal('Sign in to comment.'); return }
    if (!commentBody.trim()) return
    addComment(commentBody.trim())
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light flex-shrink-0">
            {post.user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <Link href={`/profile/${post.user?.username}`} className="text-sm font-semibold text-white hover:text-accent-light transition-colors">
              {post.user?.username}
            </Link>
            <p className="text-xs text-muted">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        {isOwn && (
          <button onClick={() => deletePost()} className="text-muted hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <p className="text-sm text-zinc-200 leading-relaxed mb-3">{post.body}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 text-muted">
        <button
          onClick={handleLike}
          className={clsx('flex items-center gap-1.5 text-xs transition-colors hover:text-red-400', isLiked && 'text-red-400')}
        >
          <Heart size={14} className={isLiked ? 'fill-red-400' : ''} />
          {post._count?.likes ?? 0}
        </button>
        <button
          onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-1.5 text-xs hover:text-white transition-colors"
        >
          <MessageSquare size={14} />
          {post._count?.comments ?? 0}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {post.comments?.map((c: any) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-light flex-shrink-0 mt-0.5">
                {c.user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="bg-surface-2 rounded-lg px-3 py-2 flex-1 min-w-0">
                <Link href={`/profile/${c.user?.username}`} className="text-xs font-semibold text-white hover:text-accent-light">
                  {c.user?.username}
                </Link>
                <p className="text-xs text-zinc-300 mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}
          {post._count?.comments > 3 && (
            <p className="text-xs text-muted pl-8">+{post._count.comments - 3} more comments</p>
          )}
          <form onSubmit={handleComment} className="flex gap-2 mt-2">
            <input
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button type="submit" disabled={isPending || !commentBody.trim()} className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-white transition-colors">
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
