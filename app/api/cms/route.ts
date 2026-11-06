import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getCachedGalleryCategories } from '@/lib/gallery'
import { getCachedActivities } from '@/lib/activities'
import { getLatestNoticesPreview } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDB()
    const [galleryCategories, activities, notices] = await Promise.all([
      getCachedGalleryCategories(),
      getCachedActivities(),
      getLatestNoticesPreview(5),
    ])

    return NextResponse.json({
      ...db,
      galleryCategories,
      activities,
      notices,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e: any) {
    console.error('[CMS API Error]: Failed to fetch CMS data:', e?.message || e)
    return NextResponse.json({ error: 'Failed to fetch CMS data' }, { status: 500 })
  }
}
