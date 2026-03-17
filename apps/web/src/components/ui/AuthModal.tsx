'use client'

import { useRouter } from 'next/navigation'
import { X, LogIn, UserPlus } from 'lucide-react'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  message?: string
}

export function AuthModal({ open, onClose, message }: AuthModalProps) {
  const router = useRouter()

  if (!open) return null

  const handleNav = (path: string) => {
    onClose()
    router.push(path)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-black/50 mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn size={22} className="text-accent-light" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Sign in required</h2>
          <p className="text-sm text-muted">
            {message || 'You need an account to do that.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleNav('/auth?mode=login')}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <LogIn size={16} />
            Sign In
          </button>
          <button
            onClick={() => handleNav('/auth?mode=register')}
            className="w-full flex items-center justify-center gap-2 bg-surface-2 hover:bg-border text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={16} />
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}
