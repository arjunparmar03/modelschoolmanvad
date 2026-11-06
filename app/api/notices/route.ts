import { NextResponse } from 'next/server'
import { getPublishedNotices } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

    const notices = await getPublishedNotices({ category, limit })

    return NextResponse.json(
      { notices },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    )
  } catch (err: any) {
    console.error('[API /api/notices Error]:', err)
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 })
  }
}

