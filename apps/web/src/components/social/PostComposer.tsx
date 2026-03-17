'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Send, Image as ImageIcon, X } from 'lucide-react'
import { GifPicker } from '@/components/ui/GifPicker'

interface PostComposerProps {
  feedKey: string[]
  placeholder?: string
  apiEndpoint?: string
}

export function PostComposer({ feedKey, placeholder = "What's on your mind?", apiEndpoint = '/posts' }: PostComposerProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [gifUrl, setGifUrl] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(apiEndpoint, {
      body: body.trim() || undefined,
      mediaUrl: gifUrl.trim() || undefined,
    }).then(r => r.data),
    onSuccess: (newItem) => {
      setBody('')
      setGifUrl('')
      setShowGifPicker(false)
      // Optimistically prepend the new item to the feed so it appears instantly
      queryClient.setQueryData(feedKey, (old: any[] | undefined) => {
        if (!old) return [newItem]
        return [newItem, ...old]
      })
      // Also invalidate so background refetch keeps things in sync
      queryClient.invalidateQueries({ queryKey: feedKey })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && !gifUrl.trim()) return
    mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-3">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent-light flex-shrink-0">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent text-sm text-white placeholder-muted resize-none focus:outline-none"
        />
      </div>

      {gifUrl && (
        <div className="relative max-w-xs rounded-xl overflow-hidden border border-border">
          <img src={gifUrl} alt="GIF" className="w-full" />
          <button type="button" onClick={() => setGifUrl('')} className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="relative flex items-center justify-between pt-1 border-t border-border">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGifPicker(s => !s)}
            className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-lg ${showGifPicker ? 'text-accent-light bg-accent/20' : 'text-muted hover:text-white hover:bg-surface-2'}`}
          >
            <ImageIcon size={14} />
            GIF
          </button>
        </div>
        {showGifPicker && (
          <GifPicker onSelect={url => setGifUrl(url)} onClose={() => setShowGifPicker(false)} />
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{body.length}/1000</span>
          <button
            type="submit"
            disabled={isPending || (!body.trim() && !gifUrl.trim())}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Send size={12} />
            {isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
