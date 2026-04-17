import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Exclude public files from middleware to save edge runs
  if (pathname.includes('.')) return NextResponse.next()

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_session')?.value
    const validToken = process.env.ADMIN_SESSION_TOKEN || 'fallback_secret_token_change_me'
    
    if (!token || token !== validToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect all /api/admin routes except /login
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    const token = request.cookies.get('admin_session')?.value
    const validToken = process.env.ADMIN_SESSION_TOKEN || 'fallback_secret_token_change_me'
    
    if (!token || token !== validToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
