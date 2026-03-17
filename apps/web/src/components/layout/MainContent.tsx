'use client'

import { usePathname } from 'next/navigation'

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideRightPanel = pathname.startsWith('/profile') || pathname.startsWith('/settings')

  return (
    <main className={`flex-1 ml-64 p-6 ${hideRightPanel ? '' : 'mr-60'}`}>
      {children}
    </main>
  )
}
