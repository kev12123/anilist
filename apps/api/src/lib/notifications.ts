import { prisma } from '@anilist/db'

export async function createNotification({
  userId,
  type,
  message,
  link,
}: {
  userId: string
  type: string
  message: string
  link?: string
}) {
  try {
    await prisma.notification.create({
      data: { userId, type, message, link },
    })
  } catch {
    // non-blocking
  }
}
