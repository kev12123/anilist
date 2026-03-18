import { Server, Socket } from 'socket.io'
import { prisma } from '@anilist/db'
import { createNotification } from './notifications'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId as string
    if (userId) socket.join(`user:${userId}`)

    socket.on('message:send', async (data: { receiverId: string; body?: string; mediaUrl?: string }) => {
      if (!userId) return
      if (!data.body && !data.mediaUrl) return

      const message = await prisma.message.create({
        data: { senderId: userId, receiverId: data.receiverId, body: data.body ?? '', mediaUrl: data.mediaUrl },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
          likes: { select: { userId: true } },
          _count: { select: { likes: true } },
        },
      })

      // Emit to receiver
      io.to(`user:${data.receiverId}`).emit('message:received', message)
      // Emit back to sender for confirmation
      socket.emit('message:sent', message)

      // Notify receiver
      try {
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
        await createNotification({
          userId: data.receiverId,
          type: 'MESSAGE',
          message: `${sender?.username} sent you a message`,
          link: '/messages',
        })
        io.to(`user:${data.receiverId}`).emit('notification:new')
      } catch { /* non-blocking */ }
    })

    socket.on('message:read', async (data: { senderId: string }) => {
      if (!userId) return
      await prisma.message.updateMany({
        where: { senderId: data.senderId, receiverId: userId, read: false },
        data: { read: true },
      })
      io.to(`user:${data.senderId}`).emit('message:read', { by: userId })
    })

    socket.on('disconnect', () => {
      if (userId) socket.leave(`user:${userId}`)
    })
  })
}
