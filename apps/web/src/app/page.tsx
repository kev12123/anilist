import { TrendingSection } from '@/components/home/TrendingSection'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Welcome to Ani.list</h1>
        <p className="text-muted">Discover, track, and discuss anime with the community</p>
      </div>
      <TrendingSection />
    </div>
  )
}
