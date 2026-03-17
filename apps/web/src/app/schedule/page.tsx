'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

type ViewMode = 'month' | 'week'

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - day))
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>('week')
  const [cursor, setCursor] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  // Compute date range for the current view
  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor)
      const end = addDays(start, 7)
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
      return { rangeStart: start, rangeEnd: end, days }
    } else {
      const start = startOfMonth(cursor)
      // Start grid from the Sunday before month start
      const gridStart = startOfWeek(start)
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const gridEnd = addDays(startOfWeek(end), 7)
      const days: Date[] = []
      let d = gridStart
      while (d < gridEnd) {
        days.push(d)
        d = addDays(d, 1)
      }
      return { rangeStart: gridStart, rangeEnd: gridEnd, days }
    }
  }, [view, cursor])

  const fromTs = Math.floor(rangeStart.getTime() / 1000)
  const toTs = Math.floor(rangeEnd.getTime() / 1000)

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', fromTs, toTs],
    queryFn: () => api.get(`/anime/schedule?from=${fromTs}&to=${toTs}&perPage=100`).then(r => r.data),
  })

  const schedules = data?.Page?.airingSchedules ?? []

  // Group by day key
  const byDay = useMemo(() => {
    const map = new Map<string, typeof schedules>()
    for (const s of schedules) {
      const d = startOfDay(new Date(s.airingAt * 1000))
      const key = d.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [schedules])

  const navigate = (dir: number) => {
    if (view === 'week') {
      setCursor(d => addDays(d, dir * 7))
    } else {
      setCursor(d => new Date(d.getFullYear(), d.getMonth() + dir, 1))
    }
  }

  const todayEntries = selectedDay
    ? (byDay.get(startOfDay(selectedDay).toDateString()) ?? [])
    : []

  const headerLabel = view === 'week'
    ? `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(rangeStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const today = new Date()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-sm text-muted mt-0.5">Anime airing calendar</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
            {(['week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setCursor(new Date()) }}
                className={clsx(
                  'px-4 py-2 text-sm font-medium capitalize transition-colors',
                  view === v ? 'bg-accent text-white' : 'text-muted hover:text-white'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Navigate */}
          <button onClick={() => navigate(-1)} className="p-2 bg-surface border border-border rounded-lg text-muted hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-white min-w-[180px] text-center">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 bg-surface border border-border rounded-lg text-muted hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => { setCursor(new Date()); setSelectedDay(new Date()) }}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-muted hover:text-white transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted py-2">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className={clsx('grid grid-cols-7 gap-1', view === 'month' ? 'auto-rows-[80px]' : 'auto-rows-[120px]')}>
            {days.map(day => {
              const key = day.toDateString()
              const entries = byDay.get(key) ?? []
              const isToday = isSameDay(day, today)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isCurrentMonth = view === 'month' ? day.getMonth() === cursor.getMonth() : true

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={clsx(
                    'rounded-xl border p-2 cursor-pointer transition-all overflow-hidden',
                    isSelected ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/40',
                    !isCurrentMonth && 'opacity-30'
                  )}
                >
                  {/* Date number */}
                  <div className={clsx(
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isToday ? 'bg-accent text-white' : 'text-muted'
                  )}>
                    {day.getDate()}
                  </div>

                  {/* Episode dots / mini cards */}
                  <div className="space-y-0.5 overflow-hidden">
                    {entries.slice(0, view === 'week' ? 4 : 2).map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-1 bg-accent/20 rounded px-1 py-0.5"
                      >
                        <span className="text-[10px] text-accent-light font-medium truncate">
                          {s.media.title.english || s.media.title.romaji}
                        </span>
                      </div>
                    ))}
                    {entries.length > (view === 'week' ? 4 : 2) && (
                      <div className="text-[10px] text-muted px-1">
                        +{entries.length - (view === 'week' ? 4 : 2)} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-surface border border-border rounded-xl p-4 sticky top-6">
            <h3 className="text-sm font-bold text-white mb-3">
              {selectedDay
                ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a day'}
            </h3>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todayEntries.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No episodes airing</p>
            ) : (
              <div className="space-y-2">
                {todayEntries
                  .sort((a: any, b: any) => a.airingAt - b.airingAt)
                  .map((s: any) => {
                    const hasAired = s.airingAt <= Math.floor(Date.now() / 1000)
                    const href = hasAired
                      ? `/anime/${s.media.id}/episode/${s.episode}`
                      : `/anime/${s.media.id}`
                    return (
                    <Link
                      key={s.id}
                      href={href}
                      className="flex gap-3 bg-surface-2 hover:bg-border rounded-lg p-2.5 transition-colors group"
                    >
                      <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={s.media.coverImage.medium}
                          alt={s.media.title.english || s.media.title.romaji}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white group-hover:text-accent-light truncate transition-colors">
                          {s.media.title.english || s.media.title.romaji}
                        </p>
                        <p className="text-xs text-muted mt-0.5">Episode {s.episode}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-accent-light">
                          <Clock size={10} />
                          {formatTime(s.airingAt)}
                        </div>
                      </div>
                    </Link>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
