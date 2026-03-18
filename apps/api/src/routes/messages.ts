import { FastifyInstance } from 'fastify'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'

export async function messageRoutes(fastify: FastifyInstance) {
  // Get conversation list
  fastify.get('/conversations', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    })

    // Group by conversation partner
    const conversations = new Map<string, any>()
    for (const msg of messages) {
      const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId
      if (!conversations.has(partnerId)) {
        conversations.set(partnerId, {
          partner: msg.senderId === user.id ? msg.receiver : msg.sender,
          lastMessage: msg,
          unread: 0,
        })
      }
      if (msg.receiverId === user.id && !msg.read) {
        const conv = conversations.get(partnerId)!
        conv.unread++
      }
    }

    return reply.send(Array.from(conversations.values()))
  })

  // Get messages with a specific user
  fastify.get('/:userId', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { userId } = request.params as { userId: string }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: userId },
          { senderId: userId, receiverId: user.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        likes: { select: { userId: true } },
        _count: { select: { likes: true } },
      },
    })
    return reply.send(messages)
  })

  // Like / unlike a message
  fastify.post('/:messageId/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { messageId } = request.params as { messageId: string }

    const existing = await prisma.messageLike.findUnique({
      where: { messageId_userId: { messageId, userId: user.id } },
    })

    if (existing) {
      await prisma.messageLike.delete({ where: { messageId_userId: { messageId, userId: user.id } } })
      return reply.send({ liked: false })
    }

    await prisma.messageLike.create({ data: { messageId, userId: user.id } })
    return reply.send({ liked: true })
  })
}
