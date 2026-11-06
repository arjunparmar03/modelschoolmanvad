'use client'

import HeroSection from '@/components/hero-section'
import LatestNoticesPreview from '@/components/latest-notices-preview'
import AboutSection from '@/components/about-section'
import QuickLinksSection from '@/components/quick-links-section'

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent relative">
      <HeroSection />
      <LatestNoticesPreview />
      <AboutSection />
      <QuickLinksSection />
    </main>
  )
}

