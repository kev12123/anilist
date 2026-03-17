import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { RightPanel } from '@/components/layout/RightPanel'
import { MainContent } from '@/components/layout/MainContent'
import { Providers } from './providers'
import { GlobalAuthModal } from '@/components/ui/GlobalAuthModal'

export const metadata: Metadata = {
  title: 'Ani.list — Your Anime Social Network',
  description: 'Track, review, and discuss anime with the community',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-white min-h-screen">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
            <RightPanel />
          </div>
          <GlobalAuthModal />
        </Providers>
      </body>
    </html>
  )
}
