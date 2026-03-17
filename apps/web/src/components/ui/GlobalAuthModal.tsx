'use client'

import { useAuthStore } from '@/store/auth'
import { AuthModal } from './AuthModal'

export function GlobalAuthModal() {
  const { authModalOpen, authModalMessage, closeAuthModal } = useAuthStore()

  return (
    <AuthModal
      open={authModalOpen}
      onClose={closeAuthModal}
      message={authModalMessage}
    />
  )
}
