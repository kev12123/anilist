'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { ArrowLeft, Send, Heart, ChevronDown, ChevronUp, Image as ImageIcon, X, Trash2 } from 'lucide-react'
import { GifPicker } from '@/components/ui/GifPicker'
import Link from 'next/link'
import { clsx } from 'clsx'

type Sort = 'new' | 'top'

function ReplyItem({ reply, discussionId, feedKey, depth = 0 }: {
  reply: any, discussionId: string, feedKey: string[], depth?: number
}) {
  const { user, token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [showReplies, setShowReplies] = useState(depth === 0)
  const [replyBody, setReplyBody] = useState('')
  const [replyGif, setReplyGif] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)

  const replyCount = reply._count?.replies ?? reply.replies?.length ?? 0

  // null = no local override, use server data
  const [localLiked, setLocalLiked] = useState<boolean | null>(null)
  const [localCount, setLocalCount] = useState<number | null>(null)

  const serverLiked = reply.likes?.some((l: any) => l.userId === user?.id) ?? false
  const serverCount = reply._count?.likes ?? reply.likes?.length ?? 0
  const liked = localLiked ?? serverLiked
  const likeCount = localCount ?? serverCount

  const handleToggleLike = async () => {
    if (!token) { openAuthModal('Sign in to like.'); return }
    const nextLiked = !liked
    const nextCount = nextLiked ? likeCount + 1 : likeCount - 1
    setLocalLiked(nextLiked)
    setLocalCount(nextCount)
    try {
      const res = await api.post(`/discussions/replies/${reply.id}/like`)
      setLocalLiked(res.data.liked)
      setLocalCount(res.data.liked ? nextCount : nextCount - 1)
    } catch {
      setLocalLiked(null)
      setLocalCount(null)
    }
  }

  const { mutate: postReply, isPending } = useMutation({
    mutationFn: ({ body, mediaUrl }: { body: string; mediaUrl?: string }) =>
      api.post(`/discussions/${discussionId}/replies`, { body: body || undefined, mediaUrl, parentId: reply.id }),
    onSuccess: () => {
      setReplyBody('')
      setReplyGif('')
      setShowGifPicker(false)
      setShowReplyBox(false)
      queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })

  const { mutate: deleteReply } = useMutation({
    mutationFn: () => api.delete(`/discussions/replies/${reply.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKey }),
  })

  const isOwn = user?.id === reply.user?.id

  return (
    <div className={clsx('flex gap-3', depth > 0 && 'ml-8 mt-2')}>
      <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light flex-shrink-0 mt-1">
        {reply.user?.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-surface-2 border border-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${reply.user?.username}`} className="text-sm font-semibold text-white hover:text-accent-light transition-colors">
                {reply.user?.username}
              </Link>
              <span className="text-xs text-muted">{new Date(reply.createdAt).toLocaleDateString()}</span>
            </div>
            {isOwn && (
              <button
                onClick={() => deleteReply()}
                className="text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
          {reply.body && <p className="text-sm text-zinc-300 leading-relaxed">{reply.body}</p>}
          {reply.mediaUrl && (
            <div className="mt-2 rounded-lg overflow-hidden max-w-sm">
              <img src={reply.mediaUrl} alt="media" className="w-full rounded-lg" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-1.5 ml-1">
          <button
            onClick={handleToggleLike}
            className={clsx('flex items-center gap-1 text-xs transition-colors hover:text-red-400 select-none', liked ? 'text-red-400' : 'text-muted')}
          >
            <Heart size={12} className={clsx('transition-all', liked ? 'fill-red-400 scale-110' : '')} />
            <span className="tabular-nums">{likeCount}</span>
          </button>
          <button
            onClick={() => {
              if (!token) { openAuthModal('Sign in to reply.'); return }
              setShowReplyBox(s => !s)
            }}
            className="text-xs text-muted hover:text-white transition-colors"
          >
            Reply
          </button>
          {replyCount > 0 && (
            <button
              onClick={() => setShowReplies(s => !s)}
              className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors"
            >
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Reply box */}
        {showReplyBox && (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!replyBody.trim() && !replyGif.trim()) return
              postReply({ body: replyBody.trim(), mediaUrl: replyGif.trim() || undefined })
            }}
            className="mt-2 space-y-2"
          >
            <div className="flex gap-2">
              <input
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder={`Reply to ${reply.user?.username}...`}
                autoFocus
                className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGifPicker(s => !s)}
                  className={clsx('p-2 rounded-lg border text-xs transition-colors', showGifPicker ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-white')}
                >
                  <ImageIcon size={12} />
                </button>
                {showGifPicker && (
                  <GifPicker onSelect={url => { setReplyGif(url); setShowGifPicker(false) }} onClose={() => setShowGifPicker(false)} />
                )}
              </div>
              <button type="submit" disabled={isPending || (!replyBody.trim() && !replyGif.trim())} className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-white transition-colors">
                <Send size={12} />
              </button>
            </div>
            {replyGif && (
              <div className="relative max-w-xs rounded-lg overflow-hidden border border-border">
                <img src={replyGif} alt="GIF preview" className="w-full" />
                <button type="button" onClick={() => setReplyGif('')} className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 flex items-center justify-center text-white">
                  <X size={10} />
                </button>
              </div>
            )}
          </form>
        )}

        {/* Nested replies */}
        {showReplies && reply.replies?.length > 0 && (
          <div className="mt-2 space-y-2">
            {reply.replies.map((r: any) => (
              <ReplyItem key={r.id} reply={r} discussionId={discussionId} feedKey={feedKey} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EpisodePage() {
  const { id, ep } = useParams() as { id: string; ep: string }
  const { token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [replyBody, setReplyBody] = useState('')
  const [replyGifMain, setReplyGifMain] = useState('')
  const [showGifPickerMain, setShowGifPickerMain] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sort, setSort] = useState<Sort>('new')

  useEffect(() => { setMounted(true) }, [])

  const feedKey = ['episode-thread', id, ep, sort]

  const { data: animeTitle } = useQuery({
    queryKey: ['anime-title', id],
    queryFn: async () => {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(id: $id, type: ANIME) { title { english romaji } } }`,
          variables: { id: Number(id) },
        }),
      })
      const json = await res.json()
      const t = json.data?.Media?.title
      return t?.english || t?.romaji || null
    },
    enabled: mounted,
    staleTime: Infinity,
  })

  const { data: thread, isLoading, error } = useQuery({
    queryKey: feedKey,
    queryFn: async () => {
      try {
        return await api.get(`/discussions/episode?anilistId=${id}&episodeNumber=${ep}`).then(r => r.data)
      } catch (err: any) {
        if (err?.response?.data?.error === 'NOT_AIRED') {
          throw { notAired: true, airingAt: err.response.data.airingAt }
        }
        throw err
      }
    },
    enabled: mounted,
    retry: false,
  })

  const { mutate: postReply, isPending } = useMutation({
    mutationFn: ({ body, mediaUrl }: { body: string; mediaUrl?: string }) =>
      api.post(`/discussions/${thread.id}/replies`, { body: body || undefined, mediaUrl }).then(r => r.data),
    onSuccess: () => {
      setReplyBody('')
      setReplyGifMain('')
      setShowGifMain(false)
      queryClient.invalidateQueries({ queryKey: feedKey })
      queryClient.invalidateQueries({ queryKey: ['episode-threads', Number(id)] })
    },
  })

  // Sort replies client-side
  const replies = thread?.replies ? [...thread.replies].sort((a: any, b: any) => {
    if (sort === 'top') return (b._count?.likes ?? 0) - (a._count?.likes ?? 0)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }) : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { openAuthModal('Sign in to join the discussion.'); return }
    if (!replyBody.trim() && !replyGifMain.trim()) return
    postReply({ body: replyBody.trim(), mediaUrl: replyGifMain.trim() || undefined })
  }

  if (!mounted || isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    const e = error as any
    if (e?.notAired) {
      const airingDate = e.airingAt
        ? new Date(e.airingAt * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'a future date'
      return (
        <div className="max-w-3xl mx-auto">
          <Link href={`/anime/${id}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to anime
          </Link>
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-white mb-2">Episode {ep} hasn't aired yet</h2>
            <p className="text-muted text-sm">This discussion will unlock on {airingDate}.</p>
          </div>
        </div>
      )
    }
    return <div className="text-muted text-center py-20">Failed to load discussion.</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/anime/${id}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to anime
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Episode {ep} Discussion</h1>
          {animeTitle && (
            <p className="text-sm text-accent-light mt-0.5">{animeTitle}</p>
          )}
          <p className="text-sm text-muted mt-1">{thread?.replies?.length ?? 0} comments</p>
        </div>
        {/* Sort toggle */}
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['new', 'top'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors',
                sort === s ? 'bg-accent text-white' : 'text-muted hover:text-white'
              )}
            >
              {s === 'new' ? 'Newest' : 'Top'}
            </button>
          ))}
        </div>
      </div>

      {/* Reply compose box */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-4 mb-6 space-y-3">
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder={token ? 'Share your thoughts on this episode...' : 'Sign in to comment'}
          disabled={!token}
          rows={3}
          className="w-full bg-transparent text-sm text-white placeholder-muted resize-none focus:outline-none disabled:opacity-50"
        />
        {replyGifMain && (
          <div className="relative max-w-sm rounded-xl overflow-hidden border border-border">
            <img src={replyGifMain} alt="GIF preview" className="w-full" />
            <button type="button" onClick={() => setReplyGifMain('')} className="absolute top-2 right-2 bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-white">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="relative flex items-center justify-between pt-1 border-t border-border">
          <div>
            <button
              type="button"
              onClick={() => setShowGifPickerMain(s => !s)}
              disabled={!token}
              className={clsx('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40', showGifPickerMain ? 'bg-accent text-white' : 'text-muted hover:text-white hover:bg-surface-2')}
            >
              <ImageIcon size={13} /> GIF
            </button>
            {showGifPickerMain && (
              <GifPicker onSelect={url => { setReplyGifMain(url); setShowGifPickerMain(false) }} onClose={() => setShowGifPickerMain(false)} />
            )}
          </div>
          <button
            type="submit"
            disabled={isPending || (!replyBody.trim() && !replyGifMain.trim())}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Send size={14} />
            {isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Replies */}
      <div className="space-y-4">
        {replies.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-lg mb-1">No comments yet</p>
            <p className="text-sm">Be the first to share your thoughts!</p>
          </div>
        ) : (
          replies.map((reply: any) => (
            <ReplyItem key={reply.id} reply={reply} discussionId={thread.id} feedKey={feedKey} />
          ))
        )}
      </div>
    </div>
  )
}
