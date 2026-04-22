'use client'

import HeroSection from '@/components/hero-section'
import AboutSection from '@/components/about-section'
import QuickLinksSection from '@/components/quick-links-section'
import FacilitiesSection from '@/components/facilities-section'
import ClassesSection from '@/components/classes-section'
import GallerySection from '@/components/gallery-section'
import ContactSection from '@/components/contact-section'
import LocationSection from '@/components/location-section'

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent relative">
      <HeroSection />
      <AboutSection />
      <QuickLinksSection />
      <FacilitiesSection />
      <ClassesSection />
      <GallerySection />
      <ContactSection />
      <LocationSection />
    </main>
  )
}

