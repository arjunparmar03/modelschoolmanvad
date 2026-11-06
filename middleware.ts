import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Exclude static assets from middleware to save edge runs
  if (pathname.includes('.')) return NextResponse.next()

  // 1. Refresh Supabase session and retrieve authenticated user
  const { supabaseResponse, user } = await updateSession(request)

  const isAdmin = Boolean(user && user.app_metadata?.role === 'admin')

  // 2. Protect all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAdmin) {
      const redirectUrl = new URL('/admin/login', request.url)
      const redirectResponse = NextResponse.redirect(redirectUrl)
      
      // Preserve any refreshed or cleared session cookies on the redirect response
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return redirectResponse
    }
  }

  // 3. Protect all /api/admin routes except /api/admin/login and /api/admin/logout
  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 401 })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
