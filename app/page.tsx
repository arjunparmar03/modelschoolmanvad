import HeroSection from '@/components/hero-section'
import LatestNoticesPreview from '@/components/latest-notices-preview'
import AboutSection from '@/components/about-section'
import QuickLinksSection from '@/components/quick-links-section'
import { getLatestNoticesPreview } from '@/lib/notices'
import { getDB } from '@/lib/db'

export const revalidate = 60

export default async function Home() {
  const [notices, db] = await Promise.all([
    getLatestNoticesPreview(3),
    getDB().catch(() => null),
  ])

  return (
    <main className="min-h-screen bg-transparent relative">
      <HeroSection initialContent={db?.content} />
      {notices && notices.length > 0 && <LatestNoticesPreview notices={notices} />}
      <AboutSection />
      <QuickLinksSection />
    </main>
  )
}
