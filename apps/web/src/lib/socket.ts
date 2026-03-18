import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let currentUserId: string | null = null

export function getSocket(userId: string): Socket {
  // If user changed, disconnect old socket
  if (socket && currentUserId !== userId) {
    socket.disconnect()
    socket = null
  }

  if (!socket) {
    currentUserId = userId
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001', {
      auth: { userId },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })

    socket.on('connect', () => {
      console.debug('[socket] connected', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.debug('[socket] disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.debug('[socket] connect error:', err.message)
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    currentUserId = null
  }
}
