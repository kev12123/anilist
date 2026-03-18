import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'
import { createActivityEvent } from './activity'
import { getAnime } from '../lib/anilist'

const createDiscussionSchema = z.object({
  anilistId: z.number(),
  episodeNumber: z.number().optional(),
  title: z.string().min(5).max(200),
  body: z.string().min(10),
})

const replySchema = z.object({
  body: z.string().min(1),
})

export async function discussionRoutes(fastify: FastifyInstance) {
  // Get or auto-create episode thread (only if episode has aired)
  fastify.get('/episode', async (request, reply) => {
    const { anilistId, episodeNumber } = request.query as {
      anilistId: string
      episodeNumber: string
    }

    const aId = Number(anilistId)
    const epNum = Number(episodeNumber)
    const now = Math.floor(Date.now() / 1000)

    // Check if episode has aired via AniList
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `
            query ($id: Int, $ep: Int) {
              AiringSchedule(mediaId: $id, episode: $ep) {
                airingAt
                episode
              }
            }
          `,
          variables: { id: aId, ep: epNum },
        }),
      })
      const json = await res.json() as any
      const airingAt = json.data?.AiringSchedule?.airingAt

      // If we got airing data and it's in the future, block the thread
      if (airingAt && airingAt > now) {
        return reply.status(403).send({
          error: 'NOT_AIRED',
          airingAt,
          message: `Episode ${epNum} hasn't aired yet.`,
        })
      }
    } catch {
      // If AniList check fails, allow through (don't block on API errors)
    }

    const REPLY_INCLUDE = {
      user: { select: { id: true, username: true, avatar: true } },
      likes: { select: { userId: true } },
      _count: { select: { replies: true, likes: true } },
      replies: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          likes: { select: { userId: true } },
          _count: { select: { replies: true, likes: true } },
          replies: {
            include: {
              user: { select: { id: true, username: true, avatar: true } },
              likes: { select: { userId: true } },
              _count: { select: { replies: true, likes: true } },
            },
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    }

    let thread = await prisma.discussion.findUnique({
      where: { anilistId_episodeNumber: { anilistId: aId, episodeNumber: epNum } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        // Only top-level replies (no parentId)
        replies: {
          where: { parentId: null },
          include: REPLY_INCLUDE,
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
    })

    // Auto-create thread if it doesn't exist
    if (!thread) {
      const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
      if (systemUser) {
        thread = await prisma.discussion.create({
          data: {
            userId: systemUser.id,
            anilistId: aId,
            episodeNumber: epNum,
            title: `Episode ${epNum} Discussion`,
            body: `Discuss episode ${epNum} here. Share your thoughts, reactions, and theories!`,
          },
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            replies: {
              where: { parentId: null },
              include: REPLY_INCLUDE,
              orderBy: { createdAt: 'asc' },
            },
            _count: { select: { replies: true } },
          },
        })
      }
    }

    return reply.send(thread)
  })

  // Get all episode threads for an anime (just counts, for the episode list)
  fastify.get('/anime/:anilistId/episodes', async (request, reply) => {
    const { anilistId } = request.params as { anilistId: string }
    const threads = await prisma.discussion.findMany({
      where: { anilistId: Number(anilistId), episodeNumber: { not: null } },
      select: {
        id: true,
        episodeNumber: true,
        _count: { select: { replies: true } },
      },
      orderBy: { episodeNumber: 'asc' },
    })
    return reply.send(threads)
  })

  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = createDiscussionSchema.parse(request.body)
    const discussion = await prisma.discussion.create({
      data: { userId: user.id, ...body },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
    return reply.status(201).send(discussion)
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        replies: {
          where: { parentId: null },
          include: REPLY_INCLUDE,
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!discussion) return reply.status(404).send({ error: 'Not found' })
    return reply.send(discussion)
  })

  fastify.post('/:id/replies', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const { body: bodyText, parentId, mediaUrl } = z.object({
      body: z.string().min(1).optional(),
      mediaUrl: z.string().url().optional(),
      parentId: z.string().optional(),
    }).parse(request.body)

    if (!bodyText && !mediaUrl) return reply.status(400).send({ error: 'Reply must have text or media' })

    const reply_ = await prisma.reply.create({
      data: { userId: user.id, discussionId: id, body: bodyText, mediaUrl, parentId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        likes: { select: { userId: true } },
        _count: { select: { replies: true, likes: true } },
        replies: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          take: 3,
        },
      },
    })

    // Fire activity event for episode comments
    try {
      const discussion = await prisma.discussion.findUnique({ where: { id } })
      if (discussion?.episodeNumber) {
        const animeData = await getAnime(discussion.anilistId)
        const media = animeData?.Media
        const animeTitle = media?.title?.english || media?.title?.romaji
        await createActivityEvent({
          userId: user.id,
          type: 'EPISODE_COMMENT',
          anilistId: discussion.anilistId,
          body: bodyText ? bodyText.slice(0, 200) : undefined,
          animeTitle: animeTitle ? `${animeTitle} — Episode ${discussion.episodeNumber}` : `Episode ${discussion.episodeNumber}`,
          animeCover: media?.coverImage?.medium,
        })
      }
    } catch { /* non-blocking */ }

    return reply.status(201).send(reply_)
  })

  // Delete a reply
  fastify.delete('/replies/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const existing = await prisma.reply.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    if (existing.userId !== user.id) return reply.status(403).send({ error: 'Forbidden' })
    await prisma.reply.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Like / unlike a reply
  fastify.post('/replies/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const existing = await prisma.replyLike.findUnique({
      where: { replyId_userId: { replyId: id, userId: user.id } },
    })
    if (existing) {
      await prisma.replyLike.delete({ where: { replyId_userId: { replyId: id, userId: user.id } } })
      return reply.send({ liked: false })
    }
    await prisma.replyLike.create({ data: { replyId: id, userId: user.id } })
    return reply.send({ liked: true })
  })
}
