import { NextResponse } from 'next/server'
import { getAllNoticesAdmin } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const notices = await getAllNoticesAdmin()
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
    console.error('[Admin Notices API Error]:', err.message)
    const isUnauthorized = err.message?.includes('Unauthorized') || err.message?.includes('auth')
    return NextResponse.json(
      { error: err.message || 'Failed to fetch admin notices' },
      { status: isUnauthorized ? 401 : 500 }
    )
  }
}

