import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

export async function postRoutes(fastify: FastifyInstance) {
  // Create a post
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(request.body)
    const post = await prisma.post.create({
      data: { userId: user.id, body },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true, likes: true } },
      },
    })
    return reply.status(201).send(post)
  })

  // Get feed posts (from users you follow + yourself)
  fastify.get('/feed', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })
    const ids = [user.id, ...following.map(f => f.followingId)]

    const posts = await prisma.post.findMany({
      where: { userId: { in: ids } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        comments: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
        likes: { select: { userId: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    return reply.send(posts)
  })

  // Get posts for a specific user profile
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const posts = await prisma.post.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        comments: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
        likes: { select: { userId: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return reply.send(posts)
  })

  // Comment on a post
  fastify.post('/:id/comments', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const { body } = z.object({ body: z.string().min(1).max(500) }).parse(request.body)
    const comment = await prisma.postComment.create({
      data: { postId: id, userId: user.id, body },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
    return reply.status(201).send(comment)
  })

  // Like / unlike a post
  fastify.post('/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId: user.id } },
    })
    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId: id, userId: user.id } } })
      return reply.send({ liked: false })
    }
    await prisma.postLike.create({ data: { postId: id, userId: user.id } })
    return reply.send({ liked: true })
  })

  // Delete a post
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Not found' })
    if (post.userId !== user.id) return reply.status(403).send({ error: 'Forbidden' })
    await prisma.post.delete({ where: { id } })
    return reply.status(204).send()
  })
}
