import { FastifyInstance } from 'fastify'
import { searchAnime, getAnime, getTrendingAnime, getAnimeSchedule, getAnimeAiringSchedule } from '../lib/anilist'
import { createActivityEvent } from './activity'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

export async function animeRoutes(fastify: FastifyInstance) {
  fastify.get('/schedule', async (request, reply) => {
    const { from, to, page = 1 } = request.query as { from?: string; to?: string; page?: number }
    const now = Math.floor(Date.now() / 1000)
    const fromTs = from ? Number(from) : now - 60 * 60 * 24 * 7
    const toTs = to ? Number(to) : now + 60 * 60 * 24 * 30
    const data = await getAnimeSchedule(fromTs, toTs, Number(page))
    return reply.send(data)
  })

  fastify.get('/:id/airing', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = await getAnimeAiringSchedule(Number(id))
    return reply.send(data)
  })

  fastify.get('/trending', async (request, reply) => {
    const { page = 1 } = request.query as { page?: number }
    const data = await getTrendingAnime(Number(page))
    return reply.send(data)
  })

  fastify.get('/search', async (request, reply) => {
    const { q, page = 1, genre, year } = request.query as { q?: string; page?: number; genre?: string; year?: string }
    if (!q && !genre && !year) return reply.status(400).send({ error: 'Missing search query' })
    const data = await searchAnime(q ?? '', Number(page), 20, genre, year ? Number(year) : undefined)
    return reply.send(data)
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = await getAnime(Number(id))
    return reply.send(data)
  })

  // Get all user reviews for an anime
  fastify.get('/:id/reviews', async (request, reply) => {
    const { id } = request.params as { id: string }
    const reviews = await prisma.review.findMany({
      where: { anilistId: Number(id), episodeNumber: null },
      include: { user: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      // userId is already on the review model, no need to add it separately
    })
    return reply.send(reviews)
  })

  // Get discussions for an anime
  fastify.get('/:id/discussions', async (request, reply) => {
    const { id } = request.params as { id: string }
    const discussions = await prisma.discussion.findMany({
      where: { anilistId: Number(id) },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(discussions)
  })

  // Get user's entry for this anime (auth required)
  fastify.get('/:id/entry', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    const entry = await prisma.animeEntry.findUnique({
      where: { userId_anilistId: { userId: user.id, anilistId: Number(id) } },
    })
    return reply.send(entry ?? null)
  })

  // Update anime list entry (auth required)
  const VALID_STATUSES = ['WATCHING', 'COMPLETED', 'PLAN_TO_WATCH', 'DROPPED', 'ON_HOLD'] as const
  const entrySchema = z.object({
    status: z.enum(VALID_STATUSES),
    score: z.number().min(1).max(10).optional(),
    progress: z.number().min(0).optional(),
  })

  fastify.put('/:id/entry', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }
    const body = entrySchema.parse(request.body)

    const entry = await prisma.animeEntry.upsert({
      where: { userId_anilistId: { userId: user.id, anilistId: Number(id) } },
      update: body,
      create: { userId: user.id, anilistId: Number(id), ...body },
    })

    // Auto-create activity event
    try {
      const animeData = await getAnime(Number(id))
      const media = animeData?.Media
      await createActivityEvent({
        userId: user.id,
        type: body.status,
        anilistId: Number(id),
        animeTitle: media?.title?.english || media?.title?.romaji,
        animeCover: media?.coverImage?.medium,
      })
    } catch { /* non-blocking */ }

    return reply.send(entry)
  })

  // Update episode progress only
  fastify.patch('/:id/entry/progress', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string }

    const parsed = z.object({ progress: z.number().min(0) }).safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid progress value', details: parsed.error.issues })
    }
    const { progress } = parsed.data

    try {
      const entry = await prisma.animeEntry.upsert({
        where: { userId_anilistId: { userId: user.id, anilistId: Number(id) } },
        update: { progress },
        create: { userId: user.id, anilistId: Number(id), status: 'WATCHING', progress },
      })
      return reply.send(entry)
    } catch (err: any) {
      request.log.error(err, 'Failed to update episode progress')
      return reply.status(500).send({ error: 'Failed to update progress', message: err?.message ?? 'Unknown error' })
    }
  })
}
