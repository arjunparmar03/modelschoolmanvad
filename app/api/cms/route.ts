import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getGalleryCategories, getCachedGalleryCategories } from '@/lib/gallery'
import { getActivities, getCachedActivities } from '@/lib/activities'
import { getLatestNoticesPreview } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isNoCache = searchParams.has('_t') || searchParams.has('nocache')

    const db = await getDB()
    const [galleryCategories, activities, notices] = await Promise.all([
      isNoCache ? getGalleryCategories() : getCachedGalleryCategories(),
      isNoCache ? getActivities() : getCachedActivities(),
      getLatestNoticesPreview(5),
    ])

    return NextResponse.json({
      ...db,
      galleryCategories,
      activities,
      notices,
    }, {
      headers: {
        'Cache-Control': isNoCache
          ? 'no-store, no-cache, must-revalidate'
          : 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch (e: any) {
    console.error('[CMS API Error]: Failed to fetch CMS data:', e?.message || e)
    return NextResponse.json({ error: 'Failed to fetch CMS data' }, { status: 500 })
  }
}
