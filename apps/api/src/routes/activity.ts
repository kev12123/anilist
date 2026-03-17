import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const COMMENT_INCLUDE = {
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
    take: 3,
  },
}

const INCLUDE = {
  user: { select: { id: true, username: true, avatar: true } },
  comments: {
    where: { parentId: null }, // top-level only
    include: COMMENT_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
    take: 5,
  },
  likes: { select: { userId: true } },
  _count: { select: { comments: true, likes: true } },
}

export async function activityRoutes(fastify: FastifyInstance) {
  // Get activity feed (self + following)
  fastify.get('/feed', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })
    const ids = [user.id, ...following.map(f => f.followingId)]

    const items = await prisma.activity.findMany({
      where: { userId: { in: ids } },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send(items)
  })

  // Get activity for a specific user profile
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const items = await prisma.activity.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return reply.send(items)
  })

  // Create a post (manual text activity, optionally with GIF)
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { body, mediaUrl } = z.object({
      body: z.string().max(1000).optional(),
      mediaUrl: z.string().url().optional(),
    }).parse(request.body)
    if (!body && !mediaUrl) return reply.status(400).send({ error: 'Post must have text or media' })
    const item = await prisma.activity.create({
      data: { userId: user.id, type: 'POST', body, mediaUrl },
      include: INCLUDE,
    })
    return reply.status(201).send(item)
  })

  // Delete own activity
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const item = await prisma.activity.findUnique({ where: { id } })
    if (!item) return reply.status(404).send({ error: 'Not found' })
    if (item.userId !== user.id) return reply.status(403).send({ error: 'Forbidden' })
    await prisma.activity.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Like / unlike
  fastify.post('/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const existing = await prisma.activityLike.findUnique({
      where: { activityId_userId: { activityId: id, userId: user.id } },
    })
    if (existing) {
      await prisma.activityLike.delete({ where: { activityId_userId: { activityId: id, userId: user.id } } })
      return reply.send({ liked: false })
    }
    await prisma.activityLike.create({ data: { activityId: id, userId: user.id } })
    return reply.send({ liked: true })
  })

  // Comment (top-level or reply to a comment, optionally with GIF)
  fastify.post('/:id/comments', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const { body, parentId, mediaUrl } = z.object({
      body: z.string().max(500).optional(),
      mediaUrl: z.string().url().optional(),
      parentId: z.string().optional(),
    }).parse(request.body)
    if (!body && !mediaUrl) return reply.status(400).send({ error: 'Comment must have text or media' })

    const comment = await prisma.activityComment.create({
      data: { activityId: id, userId: user.id, body, mediaUrl, parentId },
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
          take: 3,
          orderBy: { createdAt: 'asc' as const },
        },
      },
    })
    return reply.status(201).send(comment)
  })

  // Like / unlike a comment
  fastify.post('/comments/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const existing = await prisma.activityCommentLike.findUnique({
      where: { commentId_userId: { commentId: id, userId: user.id } },
    })
    if (existing) {
      await prisma.activityCommentLike.delete({ where: { commentId_userId: { commentId: id, userId: user.id } } })
      return reply.send({ liked: false })
    }
    await prisma.activityCommentLike.create({ data: { commentId: id, userId: user.id } })
    return reply.send({ liked: true })
  })

  // Get all comments for an activity (with sort)
  fastify.get('/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { sort = 'new' } = request.query as { sort?: string }

    const comments = await prisma.activityComment.findMany({
      where: { activityId: id, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: sort === 'top'
        ? { likes: { _count: 'desc' } }
        : { createdAt: 'desc' },
    })
    return reply.send(comments)
  })
}

// Helper — called internally when anime entry changes or review is created
export async function createActivityEvent(data: {
  userId: string
  type: string
  anilistId?: number
  animeTitle?: string
  animeCover?: string
  reviewScore?: number
  body?: string
}) {
  return prisma.activity.create({ data })
}
