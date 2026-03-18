import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'
import { createActivityEvent } from './activity'
import { getAnime } from '../lib/anilist'

const reviewSchema = z.object({
  anilistId: z.number(),
  episodeNumber: z.number().optional(),
  body: z.string().min(10),
  score: z.number().min(1).max(10),
})

export async function reviewRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = reviewSchema.parse(request.body)

    const existing = await prisma.review.findUnique({
      where: { userId_anilistId: { userId: user.id, anilistId: body.anilistId } },
    })
    if (existing) return reply.status(409).send({ error: 'You have already reviewed this anime.' })

    const review = await prisma.review.create({
      data: { userId: user.id, ...body },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })

    try {
      const animeData = await getAnime(body.anilistId)
      const media = animeData?.Media
      await createActivityEvent({
        userId: user.id,
        type: 'REVIEW',
        anilistId: body.anilistId,
        animeTitle: media?.title?.english || media?.title?.romaji,
        animeCover: media?.coverImage?.medium,
        reviewScore: body.score,
        body: body.body.slice(0, 200),
      })
    } catch { /* non-blocking */ }

    return reply.status(201).send(review)
  })

  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }

    const review = await prisma.review.findUnique({ where: { id } })
    if (!review) return reply.status(404).send({ error: 'Review not found' })
    if (review.userId !== user.id) return reply.status(403).send({ error: 'Forbidden' })

    await prisma.review.delete({ where: { id } })
    return reply.status(204).send()
  })
}
