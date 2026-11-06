import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getTodayIST } from '@/lib/notices'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Fetch attachment and parent notice
    const { data: attachment, error } = await supabase
      .from('notice_attachments')
      .select(`
        id,
        file_path,
        file_name,
        file_type,
        notices (
          id,
          is_published,
          publish_date,
          expiry_date
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    const parentNotice = (attachment as any).notices
    if (!parentNotice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
    }

    // 2. Verify authorization
    // Check if requester is authenticated admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const isAdmin = user?.app_metadata?.role === 'admin'

    if (!isAdmin) {
      const todayIST = getTodayIST()
      const isPublished = parentNotice.is_published === true
      const hasStarted = parentNotice.publish_date <= todayIST
      const notExpired = !parentNotice.expiry_date || parentNotice.expiry_date >= todayIST

      if (!isPublished || !hasStarted || !notExpired) {
        return NextResponse.json({ error: 'Notice is not available or has expired' }, { status: 404 })
      }
    }

    // 3. Generate fresh 15-minute signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('school-notices')
      .createSignedUrl(attachment.file_path, 900) // 15 minutes

    if (signedError || !signedData?.signedUrl) {
      console.error('[Attachment Download Signed URL Error]:', signedError?.message)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // 4. Redirect to signed URL with no-store caching headers
    return NextResponse.redirect(signedData.signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    })
  } catch (err: any) {
    console.error('[Attachment Download Route Exception]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

