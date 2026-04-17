import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDB()
    return NextResponse.json(db)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch CMS data' }, { status: 500 })
  }
}
