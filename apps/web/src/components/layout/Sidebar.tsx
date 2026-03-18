'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, LogIn, Calendar } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useEffect, useState } from 'react'
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/browse', label: 'Browse', icon: Search },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()
  const { token } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            Ani<span className="text-accent">.</span>list
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-white hover:bg-surface-2'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom bar: sign in */}
      {mounted && !token && (
        <div className="px-3 py-4 border-t border-border">
          <Link
            href="/auth"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-white hover:bg-surface-2 transition-colors"
          >
            <LogIn size={18} />
            Sign In
          </Link>
        </div>
      )}
    </aside>
  )
}
