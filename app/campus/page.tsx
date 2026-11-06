import FacilitiesSection from '@/components/facilities-section'
import ActivitiesSection from '@/components/activities-section'
import GallerySection from '@/components/gallery-section'
import { getCachedGalleryCategories } from '@/lib/gallery'
import { getCachedActivities } from '@/lib/activities'

export const revalidate = 60

export default async function CampusPage() {
  const [galleryCategories, activities] = await Promise.all([
    getCachedGalleryCategories(),
    getCachedActivities(),
  ])

  return (
    <main className="min-h-screen bg-transparent relative pt-16">
      <FacilitiesSection />
      <ActivitiesSection initialActivities={activities} />
      <GallerySection initialCategories={galleryCategories} />
    </main>
  )
}
