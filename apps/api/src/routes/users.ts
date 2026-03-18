import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'
import { createActivityEvent } from './activity'
import { createNotification } from '../lib/notifications'

const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  birthYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
})

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/find/search', async (request, reply) => {
    const { q } = request.query as { q: string }
    // Get caller's id if authenticated (optional)
    let callerId: string | null = null
    try {
      await request.jwtVerify()
      callerId = (request.user as any).id
    } catch {}

    if (!q || q.trim().length < 2) return reply.send([])
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { OR: [{ username: { contains: q } }, { bio: { contains: q } }] },
          callerId ? { id: { not: callerId } } : {},
        ],
      },
      select: {
        id: true, username: true, avatar: true, bio: true,
        _count: { select: { followers: true, following: true, reviews: true } },
      },
      take: 20,
    })
    return reply.send(users)
  })

  fastify.get('/by-id/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, avatar: true },
    })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    return reply.send(user)
  })

  fastify.get('/:username', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, avatar: true, bio: true, createdAt: true,
        _count: { select: { following: true, followers: true, reviews: true } },
        animeEntries: { orderBy: { updatedAt: 'desc' }, take: 10 },
      },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send(user)
  })

  fastify.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = updateProfileSchema.parse(request.body)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body,
      select: { id: true, username: true, avatar: true, bio: true, location: true, website: true, birthYear: true },
    })
    return reply.send(updated)
  })

  fastify.post('/:id/follow', { preHandler: [requireAuth] }, async (request, reply) => {
    const follower = request.user as { id: string }
    const { id: followingId } = request.params as { id: string }
    if (follower.id === followingId) return reply.status(400).send({ error: 'Cannot follow yourself' })

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: follower.id, followingId } },
    })

    if (!existing) {
      await prisma.follow.create({ data: { followerId: follower.id, followingId } })

      // Get the followed user's username for the activity
      const followedUser = await prisma.user.findUnique({
        where: { id: followingId },
        select: { username: true },
      })

      await createActivityEvent({
        userId: follower.id,
        type: 'FOLLOW',
        body: followedUser?.username,
      })

      // Notify the followed user
      const followerUser = await prisma.user.findUnique({ where: { id: follower.id }, select: { username: true } })
      await createNotification({
        userId: followingId,
        type: 'FOLLOW',
        message: `${followerUser?.username} started following you`,
        link: `/profile/${followerUser?.username}`,
      })
    }

    return reply.status(204).send()
  })

  fastify.delete('/:id/follow', { preHandler: [requireAuth] }, async (request, reply) => {
    const follower = request.user as { id: string }
    const { id: followingId } = request.params as { id: string }

    await prisma.follow.deleteMany({
      where: { followerId: follower.id, followingId },
    })
    return reply.status(204).send()
  })

  fastify.get('/me/list', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const entries = await prisma.animeEntry.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })

    if (entries.length === 0) return reply.send([])

    // Batch fetch anime metadata from AniList
    const ids = entries.map(e => e.anilistId)
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `
            query ($ids: [Int]) {
              Page(perPage: 50) {
                media(id_in: $ids, type: ANIME) {
                  id
                  title { romaji english }
                  coverImage { large medium }
                  episodes
                  averageScore
                }
              }
            }
          `,
          variables: { ids },
        }),
      })
      const json = await res.json() as any
      const animeMap = new Map(
        (json.data?.Page?.media ?? []).map((a: any) => [a.id, a])
      )
      const enriched = entries.map(e => ({
        ...e,
        anime: animeMap.get(e.anilistId) ?? null,
      }))
      return reply.send(enriched)
    } catch {
      return reply.send(entries)
    }
  })

  fastify.get('/me/feed', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })
    const followingIds = following.map(f => f.followingId)

    const [reviews, entries] = await Promise.all([
      prisma.review.findMany({
        where: { userId: { in: followingIds } },
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.animeEntry.findMany({
        where: { userId: { in: followingIds } },
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ])

    // Merge and sort by date
    const feed = [
      ...reviews.map(r => ({ type: 'review', ...r, date: r.createdAt })),
      ...entries.map(e => ({ type: 'entry', ...e, date: e.updatedAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 40)

    return reply.send(feed)
  })

  // Get user's followers
  fastify.get('/:username/followers', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, username: true, avatar: true, bio: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(followers.map(f => f.follower))
  })

  // Get who a user is following
  fastify.get('/:username/following', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { id: true, username: true, avatar: true, bio: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(following.map(f => f.following))
  })

  // Get user's threads
  fastify.get('/:id/threads', async (request, reply) => {
    const { id } = request.params as { id: string }
    const threads = await prisma.discussion.findMany({
      where: { userId: id, episodeNumber: null },
      include: {
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(threads)
  })

  // Get user's reviews (with anime titles from AniList)
  fastify.get('/:username/reviews', async (request, reply) => {
    const { username } = request.params as { username: string }
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.status(404).send({ error: 'Not found' })
    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!reviews.length) return reply.send([])

    // Batch fetch anime titles
    const ids = [...new Set(reviews.map(r => r.anilistId))]
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id title { romaji english } coverImage { medium } } } }`,
          variables: { ids },
        }),
      })
      const json = await res.json() as any
      const animeMap = new Map((json.data?.Page?.media ?? []).map((a: any) => [a.id, a]))
      return reply.send(reviews.map(r => ({ ...r, anime: animeMap.get(r.anilistId) ?? null })))
    } catch {
      return reply.send(reviews)
    }
  })
}
