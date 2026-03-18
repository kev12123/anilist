'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface GifPickerProps {
  onSelect: (url: string) => void
  onClose: () => void
}

interface GifResult {
  id: string
  title: string
  url: string
  preview: string
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posStyle, setPosStyle] = useState<CSSProperties>({ bottom: '100%', left: 0, marginBottom: '8px' })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetchGifs('')
  }, [])

  // After first render, measure and correct position so it stays within viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const style: CSSProperties = {}

    // Vertical: prefer opening upward; flip downward if not enough space above
    if (rect.top < 8) {
      style.bottom = 'auto'
      style.top = '100%'
      style.marginTop = '8px'
      style.marginBottom = undefined
    } else {
      style.bottom = '100%'
      style.top = 'auto'
      style.marginBottom = '8px'
    }

    // Horizontal: prefer left-aligned; shift left if overflowing right edge
    if (rect.right > vw - 8) {
      style.left = 'auto'
      style.right = 0
    } else {
      style.left = 0
      style.right = 'auto'
    }

    setPosStyle(style)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const fetchGifs = async (searchQuery: string) => {
    setLoading(true)
    setError('')
    try {
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY
      if (!apiKey) {
        setError('Giphy API key not configured')
        setLoading(false)
        return
      }

      const url = searchQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=24&rating=pg`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=pg`

      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok || json.meta?.status !== 200) {
        setError(json.meta?.msg ?? `Error ${res.status}`)
        setLoading(false)
        return
      }

      const gifs: GifResult[] = (json.data ?? [])
        .map((g: any) => ({
          id: g.id,
          title: g.title ?? '',
          url: g.images?.original?.url ?? '',
          preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || '',
        }))
        .filter((g: GifResult) => g.url && g.preview)

      setResults(gifs)
    } catch (err: any) {
      setError('Failed to load GIFs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(value), 400)
  }

  return (
    <div
      ref={containerRef}
      style={posStyle}
      className="absolute z-50 w-80 bg-surface-2 border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors flex-shrink-0 p-1">
          <X size={15} />
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted">{query ? `No GIFs for "${query}"` : 'No results'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {results.map(gif => (
              <button
                key={gif.id}
                type="button"
                onClick={() => { onSelect(gif.url); onClose() }}
                className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-accent transition-all bg-surface"
                title={gif.title}
              >
                <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-center">
        <span className="text-[10px] text-muted">Powered by GIPHY</span>
      </div>
    </div>
  )
}
