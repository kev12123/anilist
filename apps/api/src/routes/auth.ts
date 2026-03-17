import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@anilist/db'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Email or username already taken' })
    }

    const hashed = await bcrypt.hash(body.password, 12)
    const user = await prisma.user.create({
      data: { email: body.email, username: body.username, password: hashed },
      select: { id: true, email: true, username: true, avatar: true, bio: true, createdAt: true },
    })

    const token = fastify.jwt.sign({ id: user.id, username: user.username })
    return reply.send({ token, user })
  })

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.password, user.password)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = fastify.jwt.sign({ id: user.id, username: user.username })
    const { password: _, ...safeUser } = user
    return reply.send({ token, user: safeUser })
  })

  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, username: true, avatar: true, bio: true, createdAt: true },
    })
    return reply.send(user)
  })
}
