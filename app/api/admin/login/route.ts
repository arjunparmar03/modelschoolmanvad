import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    // We use environment variables with powerful fallbacks while testing.
    const validUsername = process.env.ADMIN_USERNAME || 'modelmanvad123'
    const validPassword = process.env.ADMIN_PASSWORD || 'password123'
    const sessionToken = process.env.ADMIN_SESSION_TOKEN || 'fallback_secret_token_change_me'

    if (username === validUsername && password === validPassword) {
      const response = NextResponse.json({ success: true })
      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      })
      
      return response
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
