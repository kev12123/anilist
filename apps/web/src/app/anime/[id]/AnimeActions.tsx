'use client'

import { useState, useEffect } from 'react'
import { Play, BookOpen, ChevronDown, Check } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const STATUSES = [
  { key: 'WATCHING', label: 'Watching' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PLAN_TO_WATCH', label: 'Plan to Watch' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'DROPPED', label: 'Dropped' },
]

interface AnimeActionsProps {
  animeId: number
}

export function AnimeActions({ animeId }: AnimeActionsProps) {
  const { token, openAuthModal } = useAuthStore()
  const queryClient = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Fetch existing entry once mounted and authenticated
  const { data: existingEntry } = useQuery({
    queryKey: ['anime-entry', animeId],
    queryFn: () => api.get(`/anime/${animeId}/entry`).then(r => r.data),
    enabled: mounted && !!token,
  })

  // Sync saved state with existing entry
  useEffect(() => {
    if (existingEntry?.status) setSaved(existingEntry.status)
  }, [existingEntry])

  if (!mounted) return null

  const handleAddToList = () => {
    if (!token) {
      openAuthModal('Sign in to add anime to your list.')
      return
    }
    setShowPicker(p => !p)
  }

  const handleSelectStatus = async (status: string) => {
    setShowPicker(false)
    setSaving(true)
    try {
      await api.put(`/anime/${animeId}/entry`, { status })
      setSaved(status)
      queryClient.invalidateQueries({ queryKey: ['mylist'] })
      queryClient.invalidateQueries({ queryKey: ['anime-entry', animeId] })
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false)
    }
  }

  const handleWriteReview = () => {
    if (!token) {
      openAuthModal('Sign in to write a review.')
      return
    }
    // TODO: open review modal
  }

  const currentLabel = STATUSES.find(s => s.key === saved)?.label

  return (
    <div className="flex gap-3 mt-5 relative">
      <div className="relative">
        <button
          onClick={handleAddToList}
          disabled={saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saved ? <Check size={16} /> : <Play size={16} />}
          {saving ? 'Saving...' : currentLabel ? currentLabel : 'Add to List'}
          <ChevronDown size={14} />
        </button>

        {showPicker && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-surface-2 border border-border rounded-xl shadow-xl z-20 overflow-hidden">
            {STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => handleSelectStatus(s.key)}
                className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-accent/20 transition-colors flex items-center justify-between"
              >
                {s.label}
                {saved === s.key && <Check size={14} className="text-accent-light" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleWriteReview}
        className="flex items-center gap-2 bg-surface-2 hover:bg-border text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <BookOpen size={16} />
        Write Review
      </button>
    </div>
  )
}
