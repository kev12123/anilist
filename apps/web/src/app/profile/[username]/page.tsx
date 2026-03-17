'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { clsx } from 'clsx'
import { UserPlus, UserMinus, Star, List, MessageSquare, Rss, Settings, MapPin, Globe, Users } from 'lucide-react'
import { AnimeCard } from '@/components/anime/AnimeCard'
import { ActivityCard } from '@/components/social/ActivityCard'
import { PostComposer } from '@/components/social/PostComposer'

type Tab = 'posts' | 'list' | 'reviews' | 'threads' | 'followers' | 'following'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'posts',     label: 'Activity',   icon: Rss },
  { key: 'list',      label: 'Anime List', icon: List },
  { key: 'reviews',   label: 'Reviews',    icon: Star },
  { key: 'threads',   label: 'Threads',    icon: MessageSquare },
  { key: 'followers', label: 'Followers',  icon: Users },
  { key: 'following', label: 'Following',  icon: UserPlus },
]

export default function ProfilePage() {
  const { username } = useParams() as { username: string }
  const { token, user: me } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('posts')
  const [mounted, setMounted] = useState(false)
  const isOwnProfile = mounted && me?.username === username

  useEffect(() => { setMounted(true) }, [])

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then(r => r.data),
  })

  const { data: followers } = useQuery({
    queryKey: ['followers', username],
    queryFn: () => api.get(`/users/${username}/followers`).then(r => r.data),
  })

  const { data: following } = useQuery({
    queryKey: ['following', username],
    queryFn: () => api.get(`/users/${username}/following`).then(r => r.data),
    enabled: tab === 'following',
  })

  const { data: reviews } = useQuery({
    queryKey: ['user-reviews', username],
    queryFn: () => api.get(`/users/${username}/reviews`).then(r => r.data),
    enabled: tab === 'reviews',
  })

  const { data: threads } = useQuery({
    queryKey: ['user-threads', profile?.id],
    queryFn: () => api.get(`/users/${profile?.id}/threads`).then(r => r.data),
    enabled: tab === 'threads' && !!profile?.id,
  })

  const { data: animeList } = useQuery({
    queryKey: ['mylist'],
    queryFn: () => api.get('/users/me/list').then(r => r.data),
    enabled: tab === 'list' && isOwnProfile && !!token,
  })

  const { data: activity } = useQuery({
    queryKey: isOwnProfile ? ['activity-feed'] : ['activity', profile?.id],
    queryFn: () => isOwnProfile
      ? api.get('/activity/feed').then(r => r.data)
      : api.get(`/activity/user/${profile?.id}`).then(r => r.data),
    enabled: tab === 'posts' && !!profile?.id && mounted,
  })

  const isFollowing = mounted && me && (followers ?? []).some((f: any) => f.id === me.id)

  const { mutate: toggleFollow, isPending: followPending } = useMutation({
    mutationFn: () => isFollowing
      ? api.delete(`/users/${profile.id}/follow`)
      : api.post(`/users/${profile.id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
      queryClient.invalidateQueries({ queryKey: ['followers', username] })
      queryClient.invalidateQueries({ queryKey: ['following', username] })
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-40 bg-surface rounded-2xl animate-pulse mb-6" />
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
      </div>
    )
  }

  if (!profile) return <div className="text-muted text-center py-20">User not found.</div>

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-accent/30 flex items-center justify-center text-3xl font-bold text-accent-light border-2 border-accent/40 flex-shrink-0">
              {profile.username[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
              {profile.bio && (
                <p className="text-sm text-muted mt-1 max-w-md">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {profile.location && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <MapPin size={11} /> {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent-light hover:underline">
                    <Globe size={11} /> {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <span className="text-xs text-muted">
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {mounted && isOwnProfile && (
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 hover:bg-border text-muted hover:text-white border border-border transition-colors flex-shrink-0"
            >
              <Settings size={15} />
              Edit Profile
            </Link>
          )}
          {mounted && token && !isOwnProfile && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => toggleFollow()}
                disabled={followPending}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60',
                  isFollowing
                    ? 'bg-surface-2 hover:bg-red-500/20 hover:text-red-400 text-muted border border-border'
                    : 'bg-accent hover:bg-accent-hover text-white'
                )}
              >
                {isFollowing ? <UserMinus size={15} /> : <UserPlus size={15} />}
                {followPending ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <Link
                href={`/messages?user=${profile.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 hover:bg-border text-muted hover:text-white border border-border transition-colors"
              >
                <MessageSquare size={15} />
                Message
              </Link>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-border">
          {[
            { label: 'Reviews', value: profile._count?.reviews ?? 0 },
            { label: 'Followers', value: profile._count?.followers ?? 0, onClick: () => setTab('followers') },
            { label: 'Following', value: profile._count?.following ?? 0, onClick: () => setTab('following') },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className="text-left hover:opacity-80 transition-opacity"
            >
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-muted">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6 w-fit">
        {TABS.filter(t => {
          if (t.key === 'list' && !isOwnProfile) return false
          return true
        }).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-accent text-white' : 'text-muted hover:text-white'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {/* Activity */}
        {tab === 'posts' && (
          <div>
            {isOwnProfile && (
              <PostComposer
                feedKey={['activity-feed']}
                apiEndpoint="/activity"
                placeholder="Share something with your followers..."
              />
            )}
            <div className="space-y-3">
              {!activity?.length ? (
                <EmptyState text="No activity yet." />
              ) : activity.map((item: any) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  feedKey={isOwnProfile ? ['activity-feed'] : ['activity', profile?.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Anime List */}
        {tab === 'list' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {!animeList?.length ? (
              <EmptyState text="No anime added yet." />
            ) : animeList.filter((e: any) => e.anime).map((entry: any) => (
              <AnimeCard
                key={entry.anilistId}
                id={entry.anilistId}
                title={entry.anime.title?.english || entry.anime.title?.romaji}
                coverImage={entry.anime.coverImage?.large}
                score={entry.anime.averageScore}
                episodes={entry.anime.episodes}
              />
            ))}
          </div>
        )}

        {/* Reviews */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            {!reviews?.length ? (
              <EmptyState text="No reviews written yet." />
            ) : reviews.map((r: any) => (
              <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {r.anime?.coverImage?.medium && (
                      <Link href={`/anime/${r.anilistId}`}>
                        <div className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0">
                          <img src={r.anime.coverImage.medium} alt="" className="w-full h-full object-cover" />
                        </div>
                      </Link>
                    )}
                    <div>
                      <Link href={`/anime/${r.anilistId}`} className="text-sm font-semibold text-white hover:text-accent-light transition-colors">
                        {r.anime?.title?.english || r.anime?.title?.romaji || `Anime #${r.anilistId}`}
                      </Link>
                      <p className="text-xs text-muted mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 px-2.5 py-1 rounded-lg flex-shrink-0">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-yellow-300">{r.score}/10</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Threads */}
        {tab === 'threads' && (
          <div className="space-y-2">
            {!threads?.length ? (
              <EmptyState text="No threads started yet." />
            ) : threads.map((d: any) => (
              <Link
                key={d.id}
                href={`/anime/${d.anilistId}/discussion/${d.id}`}
                className="flex items-center justify-between bg-surface hover:bg-surface-2 border border-border hover:border-accent/50 rounded-xl px-4 py-3 transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-accent-light transition-colors truncate">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} />{d._count?.replies ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Followers / Following */}
        {(tab === 'followers' || tab === 'following') && (
          <div className="space-y-2">
            {(tab === 'followers' ? followers : following)?.map((u: any) => (
              <UserRow key={u.id} user={u} />
            ))}
            {!(tab === 'followers' ? followers : following)?.length && (
              <EmptyState text={tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}


function UserRow({ user }: { user: any }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-center gap-3 bg-surface hover:bg-surface-2 border border-border rounded-xl px-4 py-3 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-accent/30 flex items-center justify-center text-sm font-bold text-accent-light flex-shrink-0">
        {user.username[0].toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-white group-hover:text-accent-light transition-colors">{user.username}</p>
        {user.bio && <p className="text-xs text-muted truncate max-w-xs">{user.bio}</p>}
      </div>
    </Link>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full text-center py-16 text-muted">
      <p>{text}</p>
    </div>
  )
}
