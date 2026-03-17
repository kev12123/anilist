import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { Server } from 'socket.io'
import { createServer } from 'http'

import { authRoutes } from './routes/auth'
import { animeRoutes } from './routes/anime'
import { userRoutes } from './routes/users'
import { reviewRoutes } from './routes/reviews'
import { discussionRoutes } from './routes/discussions'
import { messageRoutes } from './routes/messages'
import { postRoutes } from './routes/posts'
import { activityRoutes } from './routes/activity'
import { registerSocketHandlers } from './lib/socket'

const fastify = Fastify({ logger: true })
const httpServer = createServer(fastify.server)
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true },
})

fastify.register(cors, {
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
})
fastify.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret-change-me' })
fastify.register(cookie)

// Routes
fastify.register(authRoutes, { prefix: '/api/auth' })
fastify.register(animeRoutes, { prefix: '/api/anime' })
fastify.register(userRoutes, { prefix: '/api/users' })
fastify.register(reviewRoutes, { prefix: '/api/reviews' })
fastify.register(discussionRoutes, { prefix: '/api/discussions' })
fastify.register(messageRoutes, { prefix: '/api/messages' })
fastify.register(postRoutes, { prefix: '/api/posts' })
fastify.register(activityRoutes, { prefix: '/api/activity' })

// Socket.io
registerSocketHandlers(io)

fastify.get('/health', async () => ({ status: 'ok' }))

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 4000, host: '0.0.0.0' })
    httpServer.listen(Number(process.env.SOCKET_PORT) || 4001, () => {
      console.log(`Socket.io running on port ${process.env.SOCKET_PORT || 4001}`)
    })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
