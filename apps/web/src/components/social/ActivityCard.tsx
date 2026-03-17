'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageSquare, Trash2, Send, Star, Eye, CheckCircle, XCircle, Clock, BookMarked, UserPlus, ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react'
import { GifPicker } from '@/components/ui/GifPicker'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'

// For old-format episode comments that only stored "Episode X", fetch the anime title
function useEpisodeAnimeTitle(anilistId: number | null | undefined, animeTitle: string | null | undefined) {
  const isOldFormat = !!animeTitle && /^Episode \d+$/.test(animeTitle)
  const { data } = useQuery({
    queryKey: ['anime-title', anilistId],
    queryFn: () => api.get(`/anime/${anilistId}`).then(r => r.data),
    enabled: !!anilistId && isOldFormat,
    staleTime: Infinity,
  })
  if (!isOldFormat) return animeTitle
  const title = data?.Media?.title?.english || data?.Media?.title?.romaji
  return title ? `${title} — ${animeTitle}` : animeTitle
}
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { clsx } from 'clsx'

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  POST:             { label: 'posted',            icon: null,          color: 'text-white' },
  WATCHING:         { label: 'started watching',  icon: Eye,           color: 'text-blue-400' },
  COMPLETED:        { label: 'completed',          icon: CheckCircle,   color: 'text-green-400' },
  DROPPED:          { label: 'dropped',            icon: XCircle,       color: 'text-red-400' },
  PLAN_TO_WATCH:    { label: 'plans to watch',     icon: Clock,         color: 'text-yellow-400' },
  ON_HOLD:          { label: 'put on hold',        icon: BookMarked,    color: 'text-orange-400' },
  REVIEW:           { label: 'reviewed',           icon: Star,          color: 'text-yellow-400' },
  EPISODE_COMMENT:  { label: 'commented on',       icon: MessageSquare, color: 'text-purple-400' },
  DISCUSSION_REPLY: { label: 'replied in',         icon: MessageSquare, color: 'text-purple-400' },
  FOLLOW:           { label: 'followed',           icon: UserPlus,      color: 'text-accent-light' },
}

// ─── Like button with local optimistic state ──────────────────────────────────

function LikeButton({ initialLiked, initialCount, onToggle }: {
  initialLiked: boolean
  initialCount: number
  onToggle: () => Promise<{ liked: boolean }>
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    if (pending) return
    // Optimistic update
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount(c => nextLiked ? c + 1 : Math.max(0, c - 1))
    setPending(true)
    try {
      const res = await onToggle()
      // Sync with server response in case it differed
      setLiked(res.liked)
      setCount(c => {
        // If server says liked=true but we already incremented, keep it
        // If server says liked=false but we already decremented, keep it
        return c
      })
    } catch {
      // Rollback on error
      setLiked(liked)
      setCount(initialCount)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={clsx(
        'flex items-center gap-1.5 text-xs transition-all select-none',
        liked ? 'text-red-400' : 'text-muted hover:text-red-400'
      )}
    >
      <Heart
        size={13}
        className={clsx('transition-all', liked ? 'fill-red-400 scale-110' : '')}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  )
}

// ─── Comment composer ─────────────────────────────────────────────────────────

function CommentComposer({ onSubmit, placeholder = 'Write a comment...', isPending }: {
  onSubmit: (body: string, mediaUrl?: string) => void
  placeholder?: string
  isPending?: boolean
}) {
  const [body, setBody] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && !gifUrl.trim()) return
    onSubmit(body.trim(), gifUrl.trim() || undefined)
    setBody('')
    setGifUrl('')
    setShowGifPicker(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGifPicker(s => !s)}
            className={clsx('p-2 rounded-lg text-xs transition-colors border', showGifPicker ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-white')}
            title="Add GIF"
          >
            <ImageIcon size={12} />
          </button>
          {showGifPicker && (
            <GifPicker onSelect={url => { setGifUrl(url); setShowGifPicker(false) }} onClose={() => setShowGifPicker(false)} />
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || (!body.trim() && !gifUrl.trim())}
          className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-white transition-colors"
        >
          <Send size={12} />
        </button>
      </div>
      {gifUrl && (
        <div className="relative rounded-lg overflow-hidden border border-border max-w-xs">
          <img src={gifUrl} alt="GIF preview" className="w-full" />
          <button type="button" onClick={() => setGifUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 flex items-center justify-center text-white">
            <X size={10} />
          </button>
        </div>
      )}
    </form>
  )
}

// ─── Single comment ───────────────────────────────────────────────────────────

function CommentItem({ comment, activityId, feedKey, depth = 0 }: {
  comment: any; activityId: string; feedKey: string[]; depth?: number
}) {
  const { user, token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  const initialLiked = comment.likes?.some((l: any) => l.userId === user?.id) ?? false
  const initialCount = comment._count?.likes ?? comment.likes?.length ?? 0
  const replyCount = comment._count?.replies ?? comment.replies?.length ?? 0

  const { mutate: postReply, isPending } = useMutation({
    mutationFn: ({ body, mediaUrl }: { body: string; mediaUrl?: string }) =>
      api.post(`/activity/${activityId}/comments`, { body: body || undefined, mediaUrl, parentId: comment.id }).then(r => r.data),
    onSuccess: () => { setShowReplyBox(false); queryClient.invalidateQueries({ queryKey: feedKey }) },
  })

  return (
    <div className={clsx('flex gap-2', depth > 0 && 'ml-7 mt-2 border-l-2 border-border pl-3')}>
      <Link href={`/profile/${comment.user?.username}`}>
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-light flex-shrink-0 mt-1 hover:ring-1 ring-accent transition-all">
          {comment.user?.username?.[0]?.toUpperCase()}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-surface-2 border border-border/50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${comment.user?.username}`} className="text-xs font-semibold text-white hover:text-accent-light transition-colors">
              {comment.user?.username}
            </Link>
            <span className="text-xs text-muted">{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          {comment.body && <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{comment.body}</p>}
          {comment.mediaUrl && (
            <div className="mt-2 rounded-lg overflow-hidden max-w-xs">
              <img src={comment.mediaUrl} alt="media" className="w-full rounded-lg" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 ml-1">
          {token ? (
            <LikeButton
              initialLiked={initialLiked}
              initialCount={initialCount}
              onToggle={() => api.post(`/activity/comments/${comment.id}/like`).then(r => r.data)}
            />
          ) : (
            <button onClick={() => openAuthModal('Sign in to like.')} className="flex items-center gap-1 text-xs text-muted hover:text-red-400 transition-colors">
              <Heart size={11} /> {initialCount > 0 && initialCount}
            </button>
          )}
          {depth < 3 && (
            <button
              onClick={() => { if (!token) { openAuthModal('Sign in to reply.'); return } setShowReplyBox(s => !s) }}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Reply
            </button>
          )}
          {replyCount > 0 && (
            <button onClick={() => setShowReplies(s => !s)} className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors">
              {showReplies ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {showReplyBox && (
          <div className="mt-2">
            <CommentComposer
              placeholder={`Reply to ${comment.user?.username}...`}
              isPending={isPending}
              onSubmit={(body, mediaUrl) => postReply({ body, mediaUrl })}
            />
          </div>
        )}

        {showReplies && comment.replies?.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((r: any) => (
              <CommentItem key={r.id} comment={r} activityId={activityId} feedKey={feedKey} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activity card ────────────────────────────────────────────────────────────

interface ActivityCardProps {
  item: any
  feedKey: string[]
}

export function ActivityCard({ item, feedKey }: ActivityCardProps) {
  const { user, token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [sort, setSort] = useState<'new' | 'top'>('new')

  const meta = TYPE_META[item.type] ?? TYPE_META.POST
  const Icon = meta.icon
  const isOwn = item.user?.id === user?.id
  const displayTitle = useEpisodeAnimeTitle(
    item.type === 'EPISODE_COMMENT' ? item.anilistId : null,
    item.type === 'EPISODE_COMMENT' ? item.animeTitle : null
  ) ?? item.animeTitle
  const initialLiked = item.likes?.some((l: any) => l.userId === user?.id) ?? false
  const initialCount = item._count?.likes ?? 0

  const sortedComments = [...(item.comments ?? [])].sort((a: any, b: any) =>
    sort === 'top'
      ? (b._count?.likes ?? 0) - (a._count?.likes ?? 0)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const { mutate: deleteItem } = useMutation({
    mutationFn: () => api.delete(`/activity/${item.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKey }),
  })

  const { mutate: addComment, isPending } = useMutation({
    mutationFn: ({ body, mediaUrl }: { body: string; mediaUrl?: string }) =>
      api.post(`/activity/${item.id}/comments`, { body: body || undefined, mediaUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedKey }),
  })

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Link href={`/profile/${item.user?.username}`}>
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-xs font-bold text-accent-light flex-shrink-0 hover:ring-2 ring-accent transition-all">
              {item.user?.username?.[0]?.toUpperCase()}
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-sm leading-snug">
              <Link href={`/profile/${item.user?.username}`} className="font-semibold text-white hover:text-accent-light transition-colors">
                {item.user?.username}
              </Link>
              {item.type !== 'POST' && (
                <>
                  <span className={clsx('flex items-center gap-1 font-medium', meta.color)}>
                    {Icon && <Icon size={13} />}
                    {meta.label}
                  </span>
                  {item.type === 'FOLLOW' && item.body ? (
                    <Link href={`/profile/${item.body}`} className="font-semibold text-accent-light hover:underline">{item.body}</Link>
                  ) : displayTitle ? (
                    <Link
                      href={item.type === 'EPISODE_COMMENT'
                        ? (() => {
                            const epMatch = displayTitle.match(/Episode (\d+)/)
                            const epNum = epMatch ? epMatch[1] : '1'
                            return `/anime/${item.anilistId}/episode/${epNum}`
                          })()
                        : `/anime/${item.anilistId}`}
                      className="font-semibold text-accent-light hover:underline truncate max-w-[200px]"
                    >
                      {displayTitle}
                    </Link>
                  ) : null}
                  {item.type === 'REVIEW' && item.reviewScore && (
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs font-bold ml-1">
                      <Star size={11} className="fill-yellow-400" /> {item.reviewScore}/10
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {isOwn && (
          <button onClick={() => deleteItem()} className="text-muted hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Anime preview */}
      {item.animeCover && !['POST', 'FOLLOW'].includes(item.type) && (
        <Link
          href={item.type === 'EPISODE_COMMENT'
            ? (() => { const m = displayTitle?.match(/Episode (\d+)/); return `/anime/${item.anilistId}/episode/${m?.[1] ?? '1'}` })()
            : `/anime/${item.anilistId}`}
          className="flex gap-3 bg-surface-2 rounded-lg p-2 mb-3 hover:bg-border transition-colors group"
        >
          <div className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0">
            <Image src={item.animeCover} alt={displayTitle ?? ''} fill className="object-cover" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-xs font-semibold text-white group-hover:text-accent-light truncate">{displayTitle}</p>
            {item.body && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{item.body}</p>}
          </div>
        </Link>
      )}

      {/* Post body / GIF */}
      {item.type === 'POST' && (
        <>
          {item.body && <p className="text-sm text-zinc-200 leading-relaxed mb-2">{item.body}</p>}
          {item.mediaUrl && (
            <div className="mb-3 rounded-xl overflow-hidden max-w-sm">
              <img src={item.mediaUrl} alt="media" className="w-full rounded-xl" />
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 text-muted mt-1">
        {token ? (
          <LikeButton
            initialLiked={initialLiked}
            initialCount={initialCount}
            onToggle={() => api.post(`/activity/${item.id}/like`).then(r => r.data)}
          />
        ) : (
          <button onClick={() => openAuthModal('Sign in to like.')} className="flex items-center gap-1.5 text-xs text-muted hover:text-red-400 transition-colors">
            <Heart size={13} /> {initialCount}
          </button>
        )}
        <button
          onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-1.5 text-xs hover:text-white transition-colors"
        >
          <MessageSquare size={13} />
          {item._count?.comments ?? 0}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-3 border-t border-border space-y-3">
          <div className="flex gap-1">
            {(['new', 'top'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={clsx('px-2.5 py-1 rounded text-xs font-medium transition-colors', sort === s ? 'bg-accent text-white' : 'text-muted hover:text-white')}
              >
                {s === 'new' ? 'Newest' : 'Top'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {sortedComments.map((c: any) => (
              <CommentItem key={c.id} comment={c} activityId={item.id} feedKey={feedKey} />
            ))}
            {item._count?.comments > 5 && (
              <p className="text-xs text-muted">+{item._count.comments - 5} more</p>
            )}
          </div>

          <CommentComposer
            isPending={isPending}
            onSubmit={(body, mediaUrl) => {
              if (!token) { openAuthModal('Sign in to comment.'); return }
              addComment({ body, mediaUrl })
            }}
          />
        </div>
      )}
    </div>
  )
}
