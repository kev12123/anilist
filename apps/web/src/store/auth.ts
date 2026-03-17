import { create } from 'zustand'

interface AuthStore {
  token: string | null
  user: { id: string; username: string; avatar?: string } | null
  authModalOpen: boolean
  authModalMessage: string
  setToken: (token: string | null) => void
  setUser: (user: AuthStore['user']) => void
  openAuthModal: (message?: string) => void
  closeAuthModal: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  authModalOpen: false,
  authModalMessage: '',
  setToken: (token) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    set({ token })
  },
  setUser: (user) => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
    set({ user })
  },
  openAuthModal: (message = 'You need an account to do that.') =>
    set({ authModalOpen: true, authModalMessage: message }),
  closeAuthModal: () => set({ authModalOpen: false }),
}))

// Hydrate from localStorage after mount (client only)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token')
  const userRaw = localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : null
  if (token || user) useAuthStore.setState({ token, user })
}
