import { Server, Socket } from 'socket.io'
import { prisma } from '@anilist/db'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId as string
    if (userId) socket.join(`user:${userId}`)

    socket.on('message:send', async (data: { receiverId: string; body?: string; mediaUrl?: string }) => {
      if (!userId) return
      if (!data.body && !data.mediaUrl) return

      const message = await prisma.message.create({
        data: { senderId: userId, receiverId: data.receiverId, body: data.body ?? '', mediaUrl: data.mediaUrl },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      })

      // Emit to receiver
      io.to(`user:${data.receiverId}`).emit('message:received', message)
      // Emit back to sender for confirmation
      socket.emit('message:sent', message)
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
