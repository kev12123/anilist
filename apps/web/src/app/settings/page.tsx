'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { Save, User, MapPin, Globe, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { token, user, setUser } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    bio: '',
    avatar: '',
    location: '',
    website: '',
    birthYear: '',
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && !token) router.push('/auth')
  }, [mounted, token])

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => api.get(`/users/${user?.username}`).then(r => r.data),
    enabled: mounted && !!token && !!user?.username,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio ?? '',
        avatar: profile.avatar ?? '',
        location: profile.location ?? '',
        website: profile.website ?? '',
        birthYear: profile.birthYear?.toString() ?? '',
      })
    }
  }, [profile])

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.patch('/users/me', {
      bio: form.bio || undefined,
      avatar: form.avatar || undefined,
      location: form.location || undefined,
      website: form.website || undefined,
      birthYear: form.birthYear ? Number(form.birthYear) : undefined,
    }),
    onSuccess: (res) => {
      if (user) setUser({ ...user, avatar: res.data.avatar })
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (!mounted) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-sm text-muted mt-1">Update your public profile information</p>
        </div>
        <Link
          href={`/profile/${user?.username}`}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm text-muted hover:text-white hover:border-accent/50 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Profile
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center text-2xl font-bold text-accent-light border-2 border-accent/40 overflow-hidden">
            {form.avatar ? (
              <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              user?.username?.[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Avatar URL</label>
            <input
              type="url"
              value={form.avatar}
              onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))}
              placeholder="https://example.com/your-avatar.jpg"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-muted mt-1">Paste a direct image URL</p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1.5">
            <User size={14} /> Bio
          </label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Tell people a bit about yourself..."
            rows={3}
            maxLength={500}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
          />
          <p className="text-xs text-muted mt-1 text-right">{form.bio.length}/500</p>
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1.5">
            <MapPin size={14} /> Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="New York, USA"
            maxLength={100}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Website */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1.5">
            <Globe size={14} /> Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://yoursite.com"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Birth year */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1.5">
            <Calendar size={14} /> Birth Year
          </label>
          <input
            type="number"
            value={form.birthYear}
            onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))}
            placeholder="1995"
            min={1900}
            max={new Date().getFullYear()}
            className="w-48 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={() => save()}
            disabled={isPending}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Save size={15} />
            {isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
