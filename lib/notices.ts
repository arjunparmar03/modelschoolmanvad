import { unstable_cache } from 'next/cache'
import { createClient, createPublicClient } from '@/utils/supabase/server'
import {
  Notice,
  NoticeAttachment,
  NoticeCategory,
  NoticePreviewItem,
  NOTICE_CATEGORIES,
  getTodayIST,
  isNoticeNew,
  formatISTDate,
} from './notices-types'

export * from './notices-types'

/**
 * Fetches all published, active notices for public visitors.
 * Enforces IST publication and expiry date validation and dynamically generates
 * fresh 15-minute signed URLs for private attachments.
 */
export async function getPublishedNotices(options?: {
  category?: string
  search?: string
  limit?: number
}): Promise<Notice[]> {
  try {
    const supabase = await createClient()
    const todayIST = getTodayIST()

    let query = supabase
      .from('notices')
      .select(`
        id,
        title,
        description,
        notice_type,
        attachment_url,
        publish_date,
        expiry_date,
        is_published,
        created_at,
        updated_at,
        notice_attachments (
          id,
          notice_id,
          file_path,
          file_url,
          file_name,
          file_type,
          file_size,
          sort_order,
          created_at
        )
      `)
      .eq('is_published', true)
      .lte('publish_date', todayIST)
      .or(`expiry_date.is.null,expiry_date.gte.${todayIST}`)
      .order('publish_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (options?.category && options.category !== 'All') {
      query = query.eq('notice_type', options.category)
    }

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Supabase getPublishedNotices Error]:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Process notices and generate 15-minute signed URLs for private attachments
    const noticesWithSignedUrls: Notice[] = await Promise.all(
      data.map(async (rawNotice: any) => {
        const rawAttachments = (rawNotice.notice_attachments || []) as NoticeAttachment[]
        rawAttachments.sort((a, b) => {
          const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        const attachments: NoticeAttachment[] = await Promise.all(
          rawAttachments.map(async (att) => {
            let signed_url: string | undefined = undefined
            if (att.file_path) {
              const { data: signedData, error: signedError } = await supabase.storage
                .from('school-notices')
                .createSignedUrl(att.file_path, 900) // 15 minutes (900 seconds)

              if (!signedError && signedData?.signedUrl) {
                signed_url = signedData.signedUrl
              }
            }

            return {
              ...att,
              signed_url,
            }
          })
        )

        return {
          id: rawNotice.id,
          title: rawNotice.title,
          description: rawNotice.description,
          notice_type: rawNotice.notice_type as NoticeCategory,
          attachment_url: rawNotice.attachment_url,
          publish_date: rawNotice.publish_date,
          expiry_date: rawNotice.expiry_date,
          is_published: rawNotice.is_published,
          created_at: rawNotice.created_at,
          updated_at: rawNotice.updated_at,
          attachments,
          is_new: isNoticeNew(rawNotice.publish_date),
        }
      })
    )

    // Optional client-side keyword search filter if specified
    if (options?.search && options.search.trim()) {
      const term = options.search.toLowerCase().trim()
      return noticesWithSignedUrls.filter(
        (n) => n.title.toLowerCase().includes(term) || n.description.toLowerCase().includes(term)
      )
    }

    return noticesWithSignedUrls
  } catch (err: any) {
    console.error('[getPublishedNotices Exception]:', err)
    return []
  }
}

/**
 * Fetches all notices for admin dashboard (including drafts and expired notices).
 * Requires admin authentication and generates signed preview URLs using admin permissions.
 */
export async function getAllNoticesAdmin(): Promise<Notice[]> {
  try {
    const supabase = await createClient()

    // Defense-in-depth: Verify admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.app_metadata?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required.')
    }

    const { data, error } = await supabase
      .from('notices')
      .select(`
        id,
        title,
        description,
        notice_type,
        attachment_url,
        publish_date,
        expiry_date,
        is_published,
        created_at,
        updated_at,
        notice_attachments (
          id,
          notice_id,
          file_path,
          file_url,
          file_name,
          file_type,
          file_size,
          sort_order,
          created_at
        )
      `)
      .order('publish_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Supabase getAllNoticesAdmin Error]:', error.message)
      throw new Error(error.message)
    }

    if (!data) return []

    // Attach 15-minute signed preview URLs for all attachments
    const noticesWithSignedUrls: Notice[] = await Promise.all(
      data.map(async (rawNotice: any) => {
        const rawAttachments = (rawNotice.notice_attachments || []) as NoticeAttachment[]
        rawAttachments.sort((a, b) => {
          const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        const attachments: NoticeAttachment[] = await Promise.all(
          rawAttachments.map(async (att) => {
            let signed_url: string | undefined = undefined
            if (att.file_path) {
              const { data: signedData } = await supabase.storage
                .from('school-notices')
                .createSignedUrl(att.file_path, 900)

              if (signedData?.signedUrl) {
                signed_url = signedData.signedUrl
              }
            }

            return {
              ...att,
              signed_url,
            }
          })
        )

        return {
          id: rawNotice.id,
          title: rawNotice.title,
          description: rawNotice.description,
          notice_type: rawNotice.notice_type as NoticeCategory,
          attachment_url: rawNotice.attachment_url,
          publish_date: rawNotice.publish_date,
          expiry_date: rawNotice.expiry_date,
          is_published: rawNotice.is_published,
          created_at: rawNotice.created_at,
          updated_at: rawNotice.updated_at,
          attachments,
          is_new: isNoticeNew(rawNotice.publish_date),
        }
      })
    )

    return noticesWithSignedUrls
  } catch (err: any) {
    console.error('[getAllNoticesAdmin Exception]:', err)
    throw err
  }
}

/**
 * Fast database query for homepage notice previews.
 * Fetches only lightweight public notice metadata and attachment counts.
 * Deliberately excludes private signed URL generation to allow fast edge/server caching
 * and eliminate unneeded Storage roundtrips.
 */
async function fetchLatestNoticesFromDB(limit: number = 3): Promise<NoticePreviewItem[]> {
  try {
    const supabase = createPublicClient()
    const todayIST = getTodayIST()

    const { data, error } = await supabase
      .from('notices')
      .select(`
        id,
        title,
        description,
        notice_type,
        publish_date,
        created_at,
        notice_attachments ( id )
      `)
      .eq('is_published', true)
      .lte('publish_date', todayIST)
      .or(`expiry_date.is.null,expiry_date.gte.${todayIST}`)
      .order('publish_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[fetchLatestNoticesFromDB Error]:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      notice_type: row.notice_type as NoticeCategory,
      publish_date: row.publish_date,
      is_new: isNoticeNew(row.publish_date),
      attachment_count: Array.isArray(row.notice_attachments) ? row.notice_attachments.length : 0,
    }))
  } catch (err: any) {
    console.error('[fetchLatestNoticesFromDB Exception]:', err?.message || err)
    return []
  }
}

/**
 * Server-cached latest notices preview for the homepage.
 * Tagged with 'public-notices' for instant revalidation on admin mutations.
 */
export const getLatestNoticesPreview = unstable_cache(
  async (limit: number = 3) => fetchLatestNoticesFromDB(limit),
  ['latest-notices-preview'],
  {
    revalidate: 300,
    tags: ['public-notices'],
  }
)

