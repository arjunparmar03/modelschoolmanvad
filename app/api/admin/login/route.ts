import { NextResponse } from 'next/server'

/**
 * DECOMMISSIONED:
 * Legacy credentials and fallback tokens have been removed.
 * Admin authentication is managed directly via Supabase Auth in app/admin/login/page.tsx.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy login endpoint has been decommissioned. Admin authentication is now managed directly via Supabase Auth.',
    },
    { status: 410 }
  )
}
