export type NoticeCategory =
  | 'General Notices'
  | 'Admission Notices'
  | 'Merit List'
  | 'Examination Notices'
  | 'Events'

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  'General Notices',
  'Admission Notices',
  'Merit List',
  'Examination Notices',
  'Events',
]

export interface NoticeAttachment {
  id: string
  notice_id: string
  file_path: string
  file_url: string // Stable download reference: /api/notices/download/{id}
  file_name: string
  file_type: 'pdf' | 'image'
  file_size: number | null
  sort_order: number
  created_at: string
  signed_url?: string // Dynamically generated 15-min signed URL (never stored in DB)
}

export interface Notice {
  id: string
  title: string
  description: string
  notice_type: NoticeCategory
  attachment_url?: string | null
  publish_date: string
  expiry_date?: string | null
  is_published: boolean
  created_at: string
  updated_at: string
  attachments: NoticeAttachment[]
  is_new?: boolean
}

/**
 * Returns today's date in Indian Standard Time (IST, Asia/Kolkata) as YYYY-MM-DD.
 */
export function getTodayIST(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

/**
 * Determines whether a notice is considered "NEW" (published within the last 7 days in IST).
 */
export function isNoticeNew(publishDateStr: string): boolean {
  if (!publishDateStr) return false
  const today = getTodayIST()
  const todayMs = new Date(`${today}T00:00:00+05:30`).getTime()
  const pubMs = new Date(`${publishDateStr}T00:00:00+05:30`).getTime()
  const diffDays = Math.floor((todayMs - pubMs) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 7
}

/**
 * Formats a date string (YYYY-MM-DD) into an Indian-formatted readable date string (e.g. "November 5, 2026").
 */
export function formatISTDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(`${dateStr}T12:00:00+05:30`)
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

