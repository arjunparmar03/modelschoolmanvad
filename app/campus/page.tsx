import FacilitiesSection from '@/components/facilities-section'
import ActivitiesSection from '@/components/activities-section'
import GallerySection from '@/components/gallery-section'

export default function CampusPage() {
  return (
    <main className="min-h-screen bg-transparent relative pt-16">
      <FacilitiesSection />
      <ActivitiesSection />
      <GallerySection />
    </main>
  )
}
