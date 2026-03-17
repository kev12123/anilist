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
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    })
    return reply.send(messages)
  })
}
