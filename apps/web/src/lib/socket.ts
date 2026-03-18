import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(userId: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001', {
      auth: { userId },
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
