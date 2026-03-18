import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get notifications for current user
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return reply.send(notifications)
  })

  // Get unread count
  fastify.get('/unread-count', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const count = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })
    return reply.send({ count })
  })

  // Mark all as read
  fastify.post('/read-all', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return reply.send({ ok: true })
  })

  // Mark one as read
  fastify.patch('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    })
    return reply.send({ ok: true })
  })
}
