import Link from 'next/link'
import { Bell, ArrowRight, Calendar, FileText } from 'lucide-react'
import { NoticePreviewItem, NoticeCategory, formatISTDate } from '@/lib/notices-types'

function getCategoryColor(category: NoticeCategory | string) {
  switch (category) {
    case 'Admission Notices':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Merit List':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Examination Notices':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'Events':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'General Notices':
    default:
      return 'bg-primary/10 text-primary border-primary/20'
  }
}

interface LatestNoticesPreviewProps {
  notices: NoticePreviewItem[]
}

export default function LatestNoticesPreview({ notices }: LatestNoticesPreviewProps) {
  // If there are zero active notices, render nothing at all: no skeletons, no empty spaces, no layout shift
  if (!notices || notices.length === 0) {
    return null
  }

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 -mt-4 mb-8">
      <div className="glass-card rounded-2xl border border-primary/20 p-5 sm:p-7 shadow-lg shadow-black/5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold shrink-0">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg sm:text-xl font-display text-foreground">
                  Latest School Notices & Circulars
                </h3>
                <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                  Official
                </span>
              </div>
              <p className="text-xs text-foreground/60 mt-0.5">
                Important circulars, merit lists, and announcements.
              </p>
            </div>
          </div>

          <Link
            href="/notices"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-accent transition-colors shrink-0 group self-start sm:self-auto"
          >
            <span>View All Notices</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Notices Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {notices.map((notice) => (
            <Link
              key={notice.id}
              href="/notices"
              className="group flex flex-col justify-between p-4 rounded-xl bg-black/2 hover:bg-black/5 dark:bg-white/2 dark:hover:bg-white/5 border border-border/60 hover:border-primary/40 transition-all text-left"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border ${getCategoryColor(
                      notice.notice_type
                    )}`}
                  >
                    {notice.notice_type}
                  </span>

                  {notice.is_new && (
                    <span className="relative flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wider bg-accent/20 text-accent">
                      NEW
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">
                  {notice.title}
                </h4>

                {notice.description && (
                  <p className="text-xs text-foreground/65 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30 text-[0.7rem] text-foreground/50">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatISTDate(notice.publish_date)}
                </span>
                {notice.attachment_count > 0 && (
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <FileText size={12} /> {notice.attachment_count} file{notice.attachment_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
