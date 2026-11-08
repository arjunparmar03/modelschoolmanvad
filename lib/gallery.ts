import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/utils/supabase/server'
import { defaultDB } from '@/lib/db'

export interface GalleryImageItem {
  id?: string
  src: string
  alt: string
}

export interface GalleryCategoryGroup {
  id: string
  title: string
  thumbnail: string
  images: GalleryImageItem[]
}

/**
 * Maps default local categories so each image has a deterministic identifier.
 */
function getDefaultCategories(): GalleryCategoryGroup[] {
  return defaultDB.galleryCategories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    thumbnail: cat.thumbnail,
    images: cat.images.map((img, idx) => ({
      id: `${cat.id}-${idx}`,
      src: img.src,
      alt: img.alt,
    })),
  }))
}

/**
 * Fetches gallery images from Supabase `gallery_images` and groups them into
 * the hierarchical category structure expected by the website and admin UI.
 *
 * If the database table is empty or unreachable (e.g., prior to migration),
 * it logs a descriptive error and safely falls back to defaultDB to guarantee
 * public website continuity.
 */
export async function getGalleryCategories(): Promise<GalleryCategoryGroup[]> {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id, title, image_url, category, description, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Supabase Gallery Error]: Failed to query gallery_images:', error.message)
      // Safe fallback to preserve existing website content if table is not yet migrated
      return getDefaultCategories()
    }

    if (!data || data.length === 0) {
      console.warn('[Supabase Gallery Notice]: gallery_images table returned 0 rows. Using default local gallery.')
      return getDefaultCategories()
    }

    // Group flat database records by category
    const categoryMap = new Map<string, GalleryCategoryGroup>()

    for (const row of data) {
      const catTitle = (row.category || 'General').trim()
      const catSlug = catTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'category'

      if (!categoryMap.has(catTitle)) {
        categoryMap.set(catTitle, {
          id: catSlug,
          title: catTitle,
          thumbnail: row.image_url || '/placeholder.svg',
          images: [],
        })
      }

      const cat = categoryMap.get(catTitle)!
      cat.images.push({
        id: row.id,
        src: row.image_url,
        alt: row.title || catTitle,
      })
    }

    return Array.from(categoryMap.values())
  } catch (err: any) {
    console.error('[Supabase Gallery Exception]: Unexpected error during getGalleryCategories:', err?.message || err)
    return getDefaultCategories()
  }
}

/**
 * Server-cached gallery categories for public campus pages.
 * Revalidated via tag 'campus-gallery' upon admin image uploads/deletions.
 */
export const getCachedGalleryCategories = unstable_cache(
  async () => getGalleryCategories(),
  ['campus-gallery-categories'],
  {
    revalidate: 60,
    tags: ['campus-gallery'],
  }
)
