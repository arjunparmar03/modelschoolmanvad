import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getGalleryCategories } from '@/lib/gallery'
import { getActivities } from '@/lib/activities'
import { getPublishedNotices } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDB()
    const [galleryCategories, activities, notices] = await Promise.all([
      getGalleryCategories(),
      getActivities(),
      getPublishedNotices({ limit: 5 }),
    ])

    return NextResponse.json({
      ...db,
      galleryCategories,
      activities,
      notices,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    })
  } catch (e: any) {
    console.error('[CMS API Error]: Failed to fetch CMS data:', e?.message || e)
    return NextResponse.json({ error: 'Failed to fetch CMS data' }, { status: 500 })
  }
}
