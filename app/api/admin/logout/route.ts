import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Error during Supabase signOut:', err)
  }

  const cookieStore = await cookies()
  cookieStore.delete('admin_session')

  return NextResponse.redirect(new URL('/admin/login', request.url))
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Error during Supabase signOut:', err)
  }

  const cookieStore = await cookies()
  cookieStore.delete('admin_session')

  return NextResponse.json({ success: true })
}
