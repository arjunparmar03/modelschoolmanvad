import { createClient } from '@/utils/supabase/server'
import { defaultDB } from '@/lib/db'

export interface ActivityImageItem {
  id: string
  src: string
  alt: string
}

export interface ActivityGroup {
  id: string
  title: string
  description?: string
  thumbnail: string
  images: ActivityImageItem[]
  activity_date?: string
}

/**
 * Maps default local seed activities deterministically for safe initial fallback.
 */
function getDefaultActivities(): ActivityGroup[] {
  return defaultDB.activities.map((act) => ({
    id: act.id,
    title: act.title,
    description: act.description,
    thumbnail: act.thumbnail,
    images: act.images.map((img, idx) => ({
      id: `${act.id}-${idx}`,
      src: img.src,
      alt: img.alt,
    })),
  }))
}

/**
 * Fetches activities and their relational images from Supabase.
 *
 * Requirements:
 * 1. `activity_images` is the canonical source of activity photos.
 * 2. If the query encounters an error (e.g. network blip or connection issue),
 *    it logs a meaningful error and falls back to default seed activities.
 * 3. If Supabase successfully returns zero activities (e.g. all activities
 *    were deleted by an administrator), it returns an empty array `[]`.
 *    Deleted seed activities are never revived.
 * 4. Images are ordered by `sort_order ASC, created_at ASC`.
 */
export async function getActivities(): Promise<ActivityGroup[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        description,
        activity_date,
        created_at,
        updated_at,
        activity_images (
          id,
          image_url,
          caption,
          sort_order,
          created_at
        )
      `)
      .order('activity_date', { ascending: false })

    if (error) {
      console.error('[Supabase Activities Error]: Failed to query activities:', error.message)
      // Safe fallback when database is unreachable
      return getDefaultActivities()
    }

    // Legitimate empty database response: return empty array, do not re-seed
    if (!data || data.length === 0) {
      return []
    }

    return data.map((act) => {
      // Sort child images by sort_order ASC, then created_at ASC
      const rawImages = (act.activity_images || []) as any[]
      rawImages.sort((a, b) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      const images: ActivityImageItem[] = rawImages.map((img) => ({
        id: img.id,
        src: img.image_url,
        alt: img.caption || act.title,
      }))

      // activity_images is canonical. Do NOT fall back to legacy activities.image_url if images are deleted.
      const thumbnail = images[0]?.src || '/placeholder.svg'

      return {
        id: act.id,
        title: act.title,
        description: act.description,
        thumbnail,
        images,
        activity_date: act.activity_date,
      }
    })
  } catch (err: any) {
    console.error('[Supabase Activities Exception]: Unexpected error during getActivities:', err?.message || err)
    return getDefaultActivities()
  }
}

